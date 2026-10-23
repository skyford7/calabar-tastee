import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, cookieDomainForHost } from "./env";

/**
 * Single browser client for the whole app.
 *
 * The session is stored in cookies (chunked automatically by @supabase/ssr)
 * rather than localStorage. In production the cookie domain is
 * `.calabartastee.com`, so one login works on both calabartastee.com/admin
 * and admin.calabartastee.com. On localhost / Vercel preview URLs the cookie
 * is host-only.
 *
 * Security comes from Row-Level Security in Postgres, not from this key —
 * the anon/publishable key is designed to be public.
 */
export const supabase = createBrowserClient(
  SUPABASE_URL || "http://localhost:54321",
  SUPABASE_ANON_KEY || "missing-anon-key",
  {
    cookieOptions: {
      domain: cookieDomainForHost(),
      path: "/",
      sameSite: "lax",
      secure:
        typeof window !== "undefined" && window.location.protocol === "https:",
      maxAge: 60 * 60 * 24 * 30,
    },
  }
);

export const MENU_IMAGES_BUCKET = "menu-images";

/** Turn a Supabase/PostgREST error into a sentence for a toast. */
export function errorMessage(err: unknown): string {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;
  const e = err as { message?: string; code?: string; details?: string };
  if (e.code === "23503")
    return "This is still in use elsewhere (e.g. a category that has menu items).";
  if (e.code === "23505") return "That name is already taken.";
  if (e.code === "42501" || /row-level security/i.test(e.message ?? "")) {
    return "You don't have permission to do that.";
  }
  return e.message || "Something went wrong.";
}
