/**
 * Runtime configuration + staff-portal hosting rules.
 *
 * Phase 1 — NEXT_PUBLIC_ADMIN_ORIGIN empty:
 *   portal at https://calabartastee.com/admin/*
 *
 * Phase 2 — NEXT_PUBLIC_ADMIN_ORIGIN=https://admin.calabartastee.com:
 *   portal at https://admin.calabartastee.com/*
 *   https://calabartastee.com/admin/* redirects there.
 */

const trimSlash = (s: string) => s.replace(/\/+$/, "");

export const SUPABASE_URL = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const ADMIN_ORIGIN = trimSlash(
  import.meta.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? ""
);
export const AUTH_COOKIE_DOMAIN = (
  import.meta.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ?? ""
).trim();

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** True when this page is being served from the dedicated admin subdomain. */
export const isAdminHost =
  typeof window !== "undefined" &&
  (ADMIN_ORIGIN
    ? window.location.origin === ADMIN_ORIGIN
    : window.location.hostname.startsWith("admin."));

/** Path prefix of the portal on the current host: "" on the subdomain, "/admin" on the main site. */
export const PORTAL_BASE = isAdminHost ? "" : "/admin";

/** Build a portal URL: portalPath("/menu") → "/admin/menu" or "/menu". */
export function portalPath(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!PORTAL_BASE) return p;
  return p === "/" ? PORTAL_BASE : `${PORTAL_BASE}${p}`;
}

/** Where the "Staff login" link on the public site should point. */
export const staffLoginHref = ADMIN_ORIGIN
  ? `${ADMIN_ORIGIN}/login`
  : "/admin/login";

/** Only use the shared cookie domain when we are actually on that domain. */
export function cookieDomainForHost(): string | undefined {
  if (!AUTH_COOKIE_DOMAIN || typeof window === "undefined") return undefined;
  const bare = AUTH_COOKIE_DOMAIN.replace(/^\./, "");
  const host = window.location.hostname;
  return host === bare || host.endsWith(`.${bare}`)
    ? AUTH_COOKIE_DOMAIN
    : undefined;
}
