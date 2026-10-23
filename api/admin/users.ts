/**
 * Vercel Function: staff account management.
 *
 *   POST  /api/admin/users   create a login + role       (admin: staff only, dba: any role)
 *   PATCH /api/admin/users   update role / active / password / details
 *
 * Creating auth users and setting passwords needs the Supabase SECRET key, so it
 * can't happen in the browser. Every request must carry the caller's Supabase
 * access token; the caller's role is looked up in the database (never trusted
 * from the request) and these rules are enforced:
 *
 *   - Only a DBA can create, grant or revoke `admin` / `dba`.
 *   - An admin can create, edit, reset passwords for, and (de)activate `staff` only.
 *   - Nobody can change their own role or active status here.
 *   - The database additionally refuses to remove/deactivate the last active DBA.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

type Role = "dba" | "admin" | "staff";
type Caller = { id: string; role: Role };

const ROLES = ["dba", "admin", "staff"] as const;
const BAN_FOREVER = "876000h"; // ~100 years

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters.")
    .max(72),
  full_name: z.string().trim().min(1, "Name is required.").max(120),
  phone: z.string().trim().max(30).optional(),
  job_title: z.string().trim().max(60).optional(),
  role: z.enum(ROLES).default("staff"),
});

const updateSchema = z
  .object({
    user_id: z.string().uuid(),
    role: z.enum(ROLES).optional(),
    is_active: z.boolean().optional(),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters.")
      .max(72)
      .optional(),
    full_name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    job_title: z.string().trim().max(60).nullable().optional(),
  })
  .refine(v => Object.keys(v).length > 1, "Nothing to update.");

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
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
  if (!url || !secret)
    throw new HttpError(500, "Server is missing Supabase configuration.");
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Lets the audit trigger attribute changes to the person who made them.
    global: actorId ? { headers: { "x-actor-id": actorId } } : undefined,
  });
}

async function roleOf(
  db: SupabaseClient,
  userId: string
): Promise<Role | null> {
  const { data, error } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  return (data?.role as Role | undefined) ?? null;
}

async function authenticate(request: Request): Promise<Caller> {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) throw new HttpError(401, "Not signed in.");

  const db = adminClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new HttpError(401, "Your session has expired. Please sign in again.");

  const { data: profile } = await db
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();
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

async function handleCreate(caller: Caller, body: unknown) {
  const input = createSchema.parse(body);
  if (input.role !== "staff" && caller.role !== "dba") {
    throw new HttpError(
      403,
      "Only a Database Admin can create admin or DBA accounts."
    );
  }

  const db = adminClient(caller.id);
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true, // no confirmation email; the account is usable immediately
    user_metadata: {
      full_name: input.full_name,
      phone: input.phone,
      job_title: input.job_title,
    },
  });
  if (error || !data.user) {
    const msg = /already.*(registered|exists)/i.test(error?.message ?? "")
      ? "An account with that email already exists."
      : (error?.message ?? "Could not create the account.");
    throw new HttpError(400, msg);
  }

  const userId = data.user.id;
  const { error: roleError } = await db
    .from("user_roles")
    .upsert({ user_id: userId, role: input.role, granted_by: caller.id });
  if (roleError) {
    await db.auth.admin.deleteUser(userId); // roll back so we don't leave a role-less login
    throw new HttpError(500, `Could not assign role: ${roleError.message}`);
  }

  // The signup trigger copies name/phone/title from metadata; set them again in case of truncation rules.
  await db
    .from("profiles")
    .update({
      full_name: input.full_name,
      phone: input.phone || null,
      job_title: input.job_title || null,
    })
    .eq("id", userId);

  return json(201, { user_id: userId });
}

async function handleUpdate(caller: Caller, body: unknown) {
  const input = updateSchema.parse(body);
  const db = adminClient(caller.id);
  const targetRole = await roleOf(db, input.user_id);
  const isSelf = input.user_id === caller.id;

  if (isSelf && (input.role !== undefined || input.is_active !== undefined)) {
    throw new HttpError(
      400,
      "You can't change your own role or active status."
    );
  }
  if (!isSelf) assertCanManage(caller, targetRole);
  if (
    input.role !== undefined &&
    input.role !== targetRole &&
    caller.role !== "dba"
  ) {
    throw new HttpError(403, "Only a Database Admin can change roles.");
  }

  // Role
  if (input.role !== undefined && input.role !== targetRole) {
    const { error } = await db
      .from("user_roles")
      .upsert({
        user_id: input.user_id,
        role: input.role,
        granted_by: caller.id,
      });
    if (error) throw new HttpError(400, error.message);
  }

  // Profile details + active flag (DB trigger blocks deactivating the last DBA)
  const profilePatch: Record<string, unknown> = {};
  if (input.full_name !== undefined) profilePatch.full_name = input.full_name;
  if (input.phone !== undefined) profilePatch.phone = input.phone || null;
  if (input.job_title !== undefined)
    profilePatch.job_title = input.job_title || null;

  if (input.is_active === true) {
    const { error } = await db.auth.admin.updateUserById(input.user_id, {
      ban_duration: "none",
    });
    if (error) throw new HttpError(400, error.message);
    profilePatch.is_active = true;
  }
  if (input.is_active === false) profilePatch.is_active = false;

  if (Object.keys(profilePatch).length) {
    const { error } = await db
      .from("profiles")
      .update(profilePatch)
      .eq("id", input.user_id);
    if (error) throw new HttpError(400, error.message);
  }

  if (input.is_active === false) {
    // Blocks sign-in and token refresh. RLS already denies access because the profile is inactive.
    const { error } = await db.auth.admin.updateUserById(input.user_id, {
      ban_duration: BAN_FOREVER,
    });
    if (error) throw new HttpError(400, error.message);
  }

  // Password reset
  if (input.password) {
    const { error } = await db.auth.admin.updateUserById(input.user_id, {
      password: input.password,
    });
    if (error) throw new HttpError(400, error.message);
  }

  return json(200, { ok: true });
}

async function handle(
  request: Request,
  fn: (caller: Caller, body: unknown) => Promise<Response>
) {
  try {
    const caller = await authenticate(request);
    const body = await request.json().catch(() => {
      throw new HttpError(400, "Invalid JSON body.");
    });
    return await fn(caller, body);
  } catch (err) {
    if (err instanceof HttpError)
      return json(err.status, { error: err.message });
    if (err instanceof z.ZodError)
      return json(400, { error: err.issues[0]?.message ?? "Invalid input." });
    console.error("[api/admin/users]", err);
    return json(500, { error: "Unexpected server error." });
  }
}

export function POST(request: Request) {
  return handle(request, handleCreate);
}

export function PATCH(request: Request) {
  return handle(request, handleUpdate);
}
