/**
 * Runtime configuration + staff-portal hosting rules.
 *
 * The staff portal lives only at https://admin.calabartastee.com (served at the root).
 * The public site (calabartastee.com) has no /admin — old /admin and /login links
 * forward to the admin subdomain.
 */

const trimSlash = (s: string) => s.replace(/\/+$/, "");

export const SUPABASE_URL = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const ADMIN_ORIGIN = trimSlash(
  import.meta.env.NEXT_PUBLIC_ADMIN_ORIGIN || "https://admin.calabartastee.com"
);
export const AUTH_COOKIE_DOMAIN = (
  import.meta.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ?? ""
).trim();

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** True when this page is being served from the dedicated admin subdomain. */
export const isAdminHost =
  typeof window !== "undefined" &&
  (window.location.origin === ADMIN_ORIGIN ||
    window.location.hostname.startsWith("admin."));

/** Build a portal URL (the portal is always at the root of the admin host). */
export function portalPath(path = "/"): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/** Where the "Staff login" link on the public site should point. */
export const staffLoginHref = `${ADMIN_ORIGIN}/login`;

/** Only use the shared cookie domain when we are actually on that domain. */
export function cookieDomainForHost(): string | undefined {
  if (!AUTH_COOKIE_DOMAIN || typeof window === "undefined") return undefined;
  const bare = AUTH_COOKIE_DOMAIN.replace(/^\./, "");
  const host = window.location.hostname;
  return host === bare || host.endsWith(`.${bare}`)
    ? AUTH_COOKIE_DOMAIN
    : undefined;
}

/** The public website, derived from the admin host (admin.example.com → www.example.com). */
export const SITE_ORIGIN =
  typeof window !== "undefined" && window.location.hostname.startsWith("admin.")
    ? window.location.origin.replace("//admin.", "//www.")
    : "https://www.calabartastee.com";
