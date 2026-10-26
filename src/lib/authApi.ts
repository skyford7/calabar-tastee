import { supabase } from "./supabase";
import type { LoginMethod } from "./types";

/** Client for /api/auth/login (username sign-in, lockout, own credential changes). */

export class LoginError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function post<T>(body: unknown, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new LoginError("Can't reach the server. Check your connection and try again.");
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!res.ok) throw new LoginError(json.error || `Request failed (${res.status})`, json.code);
  return json;
}

export type LookupResult = { method: LoginMethod; code_length: number | null };

export const lookupUsername = (username: string) =>
  post<LookupResult>({ action: "lookup", username: username.trim().toLowerCase() });

export type LoginResult = { access_token: string; refresh_token: string; must_change: boolean };

export const loginWithSecret = (username: string, secret: string) =>
  post<LoginResult>({ action: "login", username: username.trim().toLowerCase(), secret });

/** The signed-in user changes their own password / access code. */
export async function changeOwnCredentials(method: LoginMethod, secret: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new LoginError("Your session has expired. Please sign in again.");
  return post<{ ok: true }>({ action: "change", method, secret }, token);
}

/** The signed-in user changes their own contact email. */
export async function changeOwnEmail(email: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new LoginError("Your session has expired. Please sign in again.");
  return post<{ ok: true }>({ action: "email", email }, token);
}

/** Local checks so people see mistakes before submitting. Returns an error message or null. */
export function checkSecret(method: LoginMethod, secret: string, codeLength?: number | null): string | null {
  if (method === "code") {
    if (!/^\d+$/.test(secret)) return "Access codes are numbers only.";
    if (codeLength ? secret.length !== codeLength : ![4, 6, 8].includes(secret.length))
      return codeLength ? `Enter all ${codeLength} digits.` : "Access codes must be 4, 6 or 8 digits.";
    return null;
  }
  if (secret.length < 8) return "Passwords must be at least 8 characters.";
  return null;
}

/** Random numeric access code of the given length. */
export function generateCode(length: 4 | 6 | 8): string {
  const digits = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(digits, n => String(n % 10)).join("");
}
