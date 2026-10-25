/**
 * Vercel Function: staff sign-in by username.
 *
 *   POST /api/auth/login  { action: "lookup", username }
 *       → { method: "password" | "code", code_length? }
 *   POST /api/auth/login  { action: "login", username, secret }
 *       → { access_token, refresh_token, must_change }
 *   POST /api/auth/login  { action: "change", method, secret }   (Authorization: Bearer <token>)
 *       → { ok: true }   — the signed-in user sets their own password / access code
 *
 * The real Supabase Auth password is derived from what the user types with a
 * server-only pepper (AUTH_PEPPER). Signing in directly against Supabase with
 * the typed password therefore doesn't work, so the 5-attempt lockout below
 * can't be bypassed.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SECRET_KEY, AUTH_PEPPER
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { z } from "zod";

const MAX_ATTEMPTS = 5;
const DBA_LOCK_MINUTES = 15;
const BAN_FOREVER = "876000h";

const RESTRICTED_MESSAGE =
  "Your account has been restricted due to multiple failed attempts. Please contact your Manager or Database Administrator to perform a system reset.";
const SUSPENDED_MESSAGE =
  "Your account has been suspended. Please contact your Manager or Database Administrator.";
const NOT_FOUND_MESSAGE = "We couldn't find that username.";

type Method = "password" | "code";

type ProfileRow = {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  login_method: Method;
  code_length: number | null;
  must_change_credentials: boolean;
  failed_attempts: number;
  locked_at: string | null;
  locked_until: string | null;
  credentials_migrated: boolean;
};

const PROFILE_COLUMNS =
  "id, email, username, is_active, login_method, code_length, must_change_credentials, failed_attempts, locked_at, locked_until, credentials_migrated";

class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new HttpError(500, `Server is missing ${name}.`);
  return v;
}

function serviceClient(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function anonClient(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The Supabase Auth password for a typed password / access code. */
function authSecret(method: Method, secret: string): string {
  const mac = createHmac("sha256", env("AUTH_PEPPER"))
    .update(`${method}:${secret}`)
    .digest("base64url");
  return `ct1.${mac}`;
}

function normaliseUsername(u: string): string {
  return u.trim().toLowerCase();
}

function validateSecret(method: Method, secret: string, codeLength?: number | null) {
  if (method === "code") {
    if (!/^\d+$/.test(secret)) throw new HttpError(400, "Access codes are numbers only.");
    if (![4, 6, 8].includes(secret.length))
      throw new HttpError(400, "Access codes must be 4, 6 or 8 digits.");
    if (codeLength && secret.length !== codeLength)
      throw new HttpError(400, `Enter your ${codeLength}-digit access code.`);
  } else {
    if (secret.length < 8) throw new HttpError(400, "Passwords must be at least 8 characters.");
    if (secret.length > 72) throw new HttpError(400, "Passwords must be 72 characters or fewer.");
  }
}

async function findProfile(db: SupabaseClient, username: string): Promise<ProfileRow | null> {
  const { data, error } = await db
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("username", normaliseUsername(username))
    .maybeSingle();
  if (error) throw new HttpError(500, "Could not check that username.");
  return (data as ProfileRow | null) ?? null;
}

async function roleOf(db: SupabaseClient, id: string): Promise<string | null> {
  const { data } = await db.from("user_roles").select("role").eq("user_id", id).maybeSingle();
  return (data?.role as string | undefined) ?? null;
}

/** Throws if this account may not sign in right now. */
function assertCanSignIn(p: ProfileRow) {
  if (p.locked_at) throw new HttpError(423, RESTRICTED_MESSAGE, "restricted");
  if (p.locked_until && new Date(p.locked_until).getTime() > Date.now()) {
    throw new HttpError(
      423,
      `Too many failed attempts. For security this account is locked until ${new Date(
        p.locked_until
      ).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}.`,
      "locked"
    );
  }
  if (!p.is_active) throw new HttpError(403, SUSPENDED_MESSAGE, "suspended");
}

const lookupSchema = z.object({ action: z.literal("lookup"), username: z.string().min(1).max(60) });
const loginSchema = z.object({
  action: z.literal("login"),
  username: z.string().min(1).max(60),
  secret: z.string().min(1).max(72),
});
const changeSchema = z.object({
  action: z.literal("change"),
  method: z.enum(["password", "code"]),
  secret: z.string().min(1).max(72),
});

async function handleLookup(body: unknown) {
  const { username } = lookupSchema.parse(body);
  const db = serviceClient();
  const p = await findProfile(db, username);
  if (!p || !(await roleOf(db, p.id))) throw new HttpError(404, NOT_FOUND_MESSAGE, "not_found");
  assertCanSignIn(p);
  return json(200, {
    method: p.login_method,
    code_length: p.login_method === "code" ? p.code_length : null,
  });
}

async function tryPassword(email: string, password: string) {
  const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  return data.session;
}

async function handleLogin(body: unknown) {
  const input = loginSchema.parse(body);
  const db = serviceClient();
  const p = await findProfile(db, input.username);
  if (!p || !(await roleOf(db, p.id))) throw new HttpError(404, NOT_FOUND_MESSAGE, "not_found");
  assertCanSignIn(p);

  const method = p.login_method;
  const shapeOk =
    method === "password" ||
    (/^\d+$/.test(input.secret) && (!p.code_length || input.secret.length === p.code_length));

  let session = shapeOk ? await tryPassword(p.email, authSecret(method, input.secret)) : null;

  // Accounts created before username sign-in still have their original password.
  // On the first successful sign-in it's moved to the new scheme.
  if (!session && shapeOk && !p.credentials_migrated && method === "password") {
    session = await tryPassword(p.email, input.secret);
    if (session) {
      await db.auth.admin.updateUserById(p.id, { password: authSecret("password", input.secret) });
      await db.from("profiles").update({ credentials_migrated: true }).eq("id", p.id);
    }
  }

  if (!session) {
    const attempts = p.failed_attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      const role = await roleOf(db, p.id);
      if (role === "dba") {
        // Never permanently lock out a Database Administrator — use a timed lock.
        const until = new Date(Date.now() + DBA_LOCK_MINUTES * 60_000).toISOString();
        await db.from("profiles").update({ failed_attempts: 0, locked_until: until }).eq("id", p.id);
        throw new HttpError(
          423,
          `Too many failed attempts. For security this account is locked for ${DBA_LOCK_MINUTES} minutes.`,
          "locked"
        );
      }
      await db
        .from("profiles")
        .update({ failed_attempts: attempts, locked_at: new Date().toISOString(), is_active: false })
        .eq("id", p.id);
      await db.auth.admin.updateUserById(p.id, { ban_duration: BAN_FOREVER });
      throw new HttpError(423, RESTRICTED_MESSAGE, "restricted");
    }
    await db.from("profiles").update({ failed_attempts: attempts }).eq("id", p.id);
    const left = MAX_ATTEMPTS - attempts;
    throw new HttpError(
      401,
      `Incorrect ${method === "code" ? "access code" : "password"}. ${left} attempt${left === 1 ? "" : "s"} left before your account is restricted.`,
      "wrong_secret"
    );
  }

  if (p.failed_attempts || p.locked_until) {
    await db.from("profiles").update({ failed_attempts: 0, locked_until: null }).eq("id", p.id);
  }

  return json(200, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    must_change: p.must_change_credentials,
  });
}

async function handleChange(request: Request, body: unknown) {
  const input = changeSchema.parse(body);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "Not signed in.");

  const db = serviceClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Your session has expired. Please sign in again.");

  const { data: me } = await db.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
  if (!me?.is_active) throw new HttpError(403, SUSPENDED_MESSAGE);

  validateSecret(input.method, input.secret);
  const { error: pwError } = await db.auth.admin.updateUserById(data.user.id, {
    password: authSecret(input.method, input.secret),
  });
  if (pwError) throw new HttpError(400, pwError.message);

  const { error: pError } = await db
    .from("profiles")
    .update({
      login_method: input.method,
      code_length: input.method === "code" ? input.secret.length : null,
      must_change_credentials: false,
      credentials_migrated: true,
    })
    .eq("id", data.user.id);
  if (pError) throw new HttpError(400, pError.message);

  return json(200, { ok: true });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => {
      throw new HttpError(400, "Invalid request.");
    })) as { action?: string };
    switch (body?.action) {
      case "lookup":
        return await handleLookup(body);
      case "login":
        return await handleLogin(body);
      case "change":
        return await handleChange(request, body);
      default:
        throw new HttpError(400, "Unknown action.");
    }
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message, code: err.code });
    if (err instanceof z.ZodError) return json(400, { error: err.issues[0]?.message ?? "Invalid input." });
    console.error("[api/auth/login]", err);
    return json(500, { error: "Unexpected server error." });
  }
}
