/**
 * Vercel Function: staff account management.
 *
 *   POST  /api/admin/users   create an account + role  (admin: staff only, dba: any role)
 *   PATCH /api/admin/users   update details / role / suspend / sign-in credentials
 *   DELETE /api/admin/users  permanently delete an account (admin: staff only, dba: anyone but self)
 *
 * Staff sign in with a USERNAME and either a password or a 4/6/8-digit access
 * code (see /api/auth/login). Email is kept for contact only. The Supabase Auth
 * password is derived from the typed secret with a server-only pepper.
 *
 * Rules (the caller's role comes from the database, never from the request):
 *   - Only a Database Administrator can create, grant or revoke `admin` / `dba`.
 *   - An Admin can create, edit, suspend, and set credentials for `staff` only.
 *   - Nobody can change their own role or active status here.
 *   - Reactivating an account also clears a failed-attempts restriction (system reset).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, AUTH_PEPPER
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { z } from "zod";

type Role = "dba" | "admin" | "staff";
type Caller = { id: string; role: Role };
type Method = "password" | "code";

const ROLES = ["dba", "admin", "staff"] as const;
const BAN_FOREVER = "876000h"; // ~100 years

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,29}$/,
    "Usernames are 3–30 characters: letters, numbers, dots, dashes or underscores."
  );

const credentials = z.object({
  method: z.enum(["password", "code"]),
  secret: z.string().min(1).max(72),
  must_change: z.boolean().default(true),
});

const createSchema = z.object({
  username,
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  full_name: z.string().trim().min(1, "Name is required.").max(120),
  phone: z.string().trim().max(30).optional(),
  job_title: z.string().trim().max(60).optional(),
  role: z.enum(ROLES).default("staff"),
  credentials,
});

const updateSchema = z
  .object({
    user_id: z.string().uuid(),
    username: username.optional(),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254).optional(),
    role: z.enum(ROLES).optional(),
    is_active: z.boolean().optional(),
    credentials: credentials.optional(),
    full_name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    job_title: z.string().trim().max(60).nullable().optional(),
  })
  .refine(v => Object.keys(v).length > 1, "Nothing to update.");

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function adminClient(actorId?: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new HttpError(500, "Server is missing Supabase configuration.");
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Lets the audit trigger attribute changes to the person who made them.
    global: actorId ? { headers: { "x-actor-id": actorId } } : undefined,
  });
}

/** Must match /api/auth/login. */
function authSecret(method: Method, secret: string): string {
  const pepper = process.env.AUTH_PEPPER;
  if (!pepper) throw new HttpError(500, "Server is missing AUTH_PEPPER.");
  return `ct1.${createHmac("sha256", pepper).update(`${method}:${secret}`).digest("base64url")}`;
}

function validateSecret(method: Method, secret: string) {
  if (method === "code") {
    if (!/^\d+$/.test(secret)) throw new HttpError(400, "Access codes are numbers only.");
    if (![4, 6, 8].includes(secret.length))
      throw new HttpError(400, "Access codes must be 4, 6 or 8 digits.");
  } else if (secret.length < 8) {
    throw new HttpError(400, "Passwords must be at least 8 characters.");
  }
}

async function roleOf(db: SupabaseClient, userId: string): Promise<Role | null> {
  const { data, error } = await db.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  return (data?.role as Role | undefined) ?? null;
}

async function authenticate(request: Request): Promise<Caller> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "Not signed in.");

  const db = adminClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Your session has expired. Please sign in again.");

  const { data: profile } = await db.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
  const role = await roleOf(db, data.user.id);
  if (!profile?.is_active || (role !== "dba" && role !== "admin")) {
    throw new HttpError(403, "Only admins can manage staff accounts.");
  }
  return { id: data.user.id, role };
}

function assertCanManage(caller: Caller, targetRole: Role | null) {
  if (caller.role === "dba") return;
  if (targetRole === null || targetRole === "staff") return;
  throw new HttpError(403, "Admins can only manage staff accounts.");
}

async function assertUsernameFree(db: SupabaseClient, name: string, exceptId?: string) {
  const { data } = await db.from("profiles").select("id").eq("username", name).maybeSingle();
  if (data && data.id !== exceptId) throw new HttpError(400, "That username is already taken.");
}

function credentialFields(method: Method, secret: string, mustChange: boolean) {
  return {
    login_method: method,
    code_length: method === "code" ? secret.length : null,
    must_change_credentials: mustChange,
    credentials_migrated: true,
    failed_attempts: 0,
  };
}

async function handleCreate(caller: Caller, body: unknown) {
  const input = createSchema.parse(body);
  if (input.role !== "staff" && caller.role !== "dba") {
    throw new HttpError(403, "Only a Database Administrator can create admin or Database Administrator accounts.");
  }
  validateSecret(input.credentials.method, input.credentials.secret);

  const db = adminClient(caller.id);
  await assertUsernameFree(db, input.username);

  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: authSecret(input.credentials.method, input.credentials.secret),
    email_confirm: true, // no confirmation email; usable immediately
    user_metadata: { full_name: input.full_name, phone: input.phone, job_title: input.job_title },
  });
  if (error || !data.user) {
    const msg = /already.*(registered|exists)/i.test(error?.message ?? "")
      ? "An account with that email already exists."
      : (error?.message ?? "Could not create the account.");
    throw new HttpError(400, msg);
  }

  const userId = data.user.id;
  const rollback = async (message: string) => {
    await db.auth.admin.deleteUser(userId);
    throw new HttpError(500, message);
  };

  const { error: roleError } = await db
    .from("user_roles")
    .upsert({ user_id: userId, role: input.role, granted_by: caller.id });
  if (roleError) await rollback(`Could not assign role: ${roleError.message}`);

  const { error: profileError } = await db
    .from("profiles")
    .update({
      username: input.username,
      full_name: input.full_name,
      phone: input.phone || null,
      job_title: input.job_title || null,
      ...credentialFields(input.credentials.method, input.credentials.secret, input.credentials.must_change),
    })
    .eq("id", userId);
  if (profileError) await rollback(`Could not save profile: ${profileError.message}`);

  return json(201, { user_id: userId });
}

async function handleUpdate(caller: Caller, body: unknown) {
  const input = updateSchema.parse(body);
  const db = adminClient(caller.id);
  const targetRole = await roleOf(db, input.user_id);
  const isSelf = input.user_id === caller.id;

  if (isSelf && (input.role !== undefined || input.is_active !== undefined)) {
    throw new HttpError(400, "You can't change your own role or active status.");
  }
  if (!isSelf) assertCanManage(caller, targetRole);
  if (input.username !== undefined && caller.role !== "admin" && caller.role !== "dba") {
    throw new HttpError(403, "Only an Admin or Database Administrator can change a username.");
  }
  if (input.role !== undefined && input.role !== targetRole && caller.role !== "dba") {
    throw new HttpError(403, "Only a Database Administrator can change roles.");
  }

  if (input.role !== undefined && input.role !== targetRole) {
    const { error } = await db
      .from("user_roles")
      .upsert({ user_id: input.user_id, role: input.role, granted_by: caller.id });
    if (error) throw new HttpError(400, error.message);
  }

  const patch: Record<string, unknown> = {};
  if (input.full_name !== undefined) patch.full_name = input.full_name;
  if (input.phone !== undefined) patch.phone = input.phone || null;
  if (input.job_title !== undefined) patch.job_title = input.job_title || null;
  if (input.username !== undefined) {
    await assertUsernameFree(db, input.username, input.user_id);
    patch.username = input.username;
  }

  if (input.email !== undefined) {
    const { error } = await db.auth.admin.updateUserById(input.user_id, {
      email: input.email,
      email_confirm: true,
    });
    if (error) {
      throw new HttpError(
        400,
        /already.*(registered|exists)|duplicate/i.test(error.message)
          ? "Another account already uses that email."
          : error.message
      );
    }
    patch.email = input.email;
  }

  if (input.credentials) {
    validateSecret(input.credentials.method, input.credentials.secret);
    const { error } = await db.auth.admin.updateUserById(input.user_id, {
      password: authSecret(input.credentials.method, input.credentials.secret),
    });
    if (error) throw new HttpError(400, error.message);
    Object.assign(
      patch,
      credentialFields(input.credentials.method, input.credentials.secret, input.credentials.must_change)
    );
  }

  if (input.is_active === true) {
    // Reactivate = system reset: lifts suspension and any failed-attempts restriction.
    const { error } = await db.auth.admin.updateUserById(input.user_id, { ban_duration: "none" });
    if (error) throw new HttpError(400, error.message);
    Object.assign(patch, { is_active: true, locked_at: null, locked_until: null, failed_attempts: 0 });
  }
  if (input.is_active === false) patch.is_active = false;

  if (Object.keys(patch).length) {
    const { error } = await db.from("profiles").update(patch).eq("id", input.user_id);
    if (error) throw new HttpError(400, error.message);
  }

  if (input.is_active === false) {
    // Suspend: blocks sign-in and token refresh. RLS already denies access to inactive profiles.
    const { error } = await db.auth.admin.updateUserById(input.user_id, { ban_duration: BAN_FOREVER });
    if (error) throw new HttpError(400, error.message);
  }

  return json(200, { ok: true });
}

const MAX_DELETE_ATTEMPTS = 5;
const DELETE_LOCK_MINUTES = 15;

/** Re-checks the caller's own password / access code before a permanent delete. */
async function verifyCallerSecret(db: SupabaseClient, caller: Caller, secret: string) {
  const { data: p, error } = await db
    .from("profiles")
    .select("email, login_method, code_length, failed_attempts, locked_until")
    .eq("id", caller.id)
    .maybeSingle();
  if (error || !p) throw new HttpError(500, "Could not verify your credentials.");
  if (p.locked_until && new Date(p.locked_until).getTime() > Date.now()) {
    throw new HttpError(423, "Too many failed attempts. Try again in a few minutes.");
  }
  const method = p.login_method as Method;
  const shapeOk =
    method === "password" ||
    (/^\d+$/.test(secret) && (!p.code_length || secret.length === p.code_length));
  let ok = false;
  if (shapeOk) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) throw new HttpError(500, "Server is missing Supabase configuration.");
    const anonDb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error: signErr } = await anonDb.auth.signInWithPassword({
      email: p.email,
      password: authSecret(method, secret),
    });
    ok = !signErr && !!data.session;
  }
  if (!ok) {
    const attempts = (p.failed_attempts ?? 0) + 1;
    if (attempts >= MAX_DELETE_ATTEMPTS) {
      const until = new Date(Date.now() + DELETE_LOCK_MINUTES * 60_000).toISOString();
      await db.from("profiles").update({ failed_attempts: 0, locked_until: until }).eq("id", caller.id);
      throw new HttpError(423, `Too many failed attempts. Locked for ${DELETE_LOCK_MINUTES} minutes.`);
    }
    await db.from("profiles").update({ failed_attempts: attempts }).eq("id", caller.id);
    throw new HttpError(401, `Incorrect ${method === "code" ? "access code" : "password"}.`);
  }
  if (p.failed_attempts) await db.from("profiles").update({ failed_attempts: 0 }).eq("id", caller.id);
}

async function handleDelete(caller: Caller, body: unknown) {
  const { user_id, secret } = z
    .object({
      user_id: z.string().uuid(),
      secret: z.string().min(1).max(72),
      confirm: z.literal("DELETE", { message: "Type DELETE to confirm." }),
    })
    .parse(body);
  if (user_id === caller.id) throw new HttpError(400, "You can't delete your own account.");
  const db = adminClient(caller.id);
  await verifyCallerSecret(db, caller, secret);
  assertCanManage(caller, await roleOf(db, user_id));
  const { error } = await db.auth.admin.deleteUser(user_id);
  if (error) throw new HttpError(400, error.message);
  return json(200, { ok: true });
}

async function handle(request: Request, fn: (caller: Caller, body: unknown) => Promise<Response>) {
  try {
    const caller = await authenticate(request);
    const body = await request.json().catch(() => {
      throw new HttpError(400, "Invalid JSON body.");
    });
    return await fn(caller, body);
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    if (err instanceof z.ZodError) return json(400, { error: err.issues[0]?.message ?? "Invalid input." });
    console.error("[api/admin/users]", err);
    return json(500, { error: "Unexpected server error." });
  }
}

export function POST(request: Request) {
  return handle(request, handleCreate);
}

export function DELETE(request: Request) {
  return handle(request, handleDelete);
}

export function PATCH(request: Request) {
  return handle(request, handleUpdate);
}
