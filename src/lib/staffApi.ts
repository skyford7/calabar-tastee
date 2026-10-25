import { supabase } from "./supabase";
import type { AppRole, LoginMethod } from "./types";

/** Client for the server-side staff-management function at /api/admin/users. */

export type Credentials = { method: LoginMethod; secret: string; must_change: boolean };

export type CreateStaffInput = {
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  job_title?: string;
  role: AppRole;
  credentials: Credentials;
};

export type UpdateStaffInput = {
  user_id: string;
  username?: string;
  role?: AppRole;
  is_active?: boolean;
  credentials?: Credentials;
  full_name?: string;
  phone?: string | null;
  job_title?: string | null;
};

async function call<T>(method: "POST" | "PATCH" | "DELETE", body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const res = await fetch("/api/admin/users", {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export const createStaff = (input: CreateStaffInput) => call<{ user_id: string }>("POST", input);
export const deleteStaff = (user_id: string, secret: string) =>
  call<{ ok: true }>("DELETE", { user_id, secret, confirm: "DELETE" });
export const updateStaff = (input: UpdateStaffInput) => call<{ ok: true }>("PATCH", input);

/** Readable random temporary password, e.g. "plantain-7Kq2-jollof". */
export function generatePassword(): string {
  const words = ["jollof", "egusi", "suya", "plantain", "ogbono", "afang", "moimoi", "puffpuff", "chapman", "zobo"];
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const mid = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => chars[n % chars.length]).join("");
  return `${pick()}-${mid}-${pick()}`;
}

/** Suggest a username from a full name: "Ada Okon" → "ada.okon". */
export function suggestUsername(fullName: string): string {
  return fullName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 30);
}

/** Names are stored as one "full_name"; the forms show first name + surname. */
export function splitName(full: string | null | undefined): { first: string; last: string } {
  const t = (full ?? "").trim().replace(/\s+/g, " ");
  const i = t.indexOf(" ");
  return i === -1 ? { first: t, last: "" } : { first: t.slice(0, i), last: t.slice(i + 1) };
}
export const joinName = (first: string, last: string) => `${first.trim()} ${last.trim()}`.trim();
