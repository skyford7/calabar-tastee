# Calabar Tastee

Public website (**calabartastee.com**) and staff portal for Calabar Tastee.

- **Frontend:** Vite + React 19 + TypeScript + Tailwind, single-page app
- **Backend:** Supabase (Postgres + Auth + Storage). The browser talks to Supabase directly; **Row-Level Security** enforces who can do what.
- **Server code:** one Vercel Function, `api/admin/users.ts`, for creating and managing staff logins (needs the secret key).
- **Hosting:** Vercel, deployed from GitHub `skyford7/calabar-tastee`.

## Roles

| | Staff | Admin | DBA |
|---|:-:|:-:|:-:|
| View published roster (whole team) | ✅ | ✅ | ✅ |
| Create / edit / delete menu items, prices, photos, categories | ✅ | ✅ | ✅ |
| Create, edit and publish shifts | | ✅ | ✅ |
| Create staff logins, reset passwords, deactivate staff | | ✅ | ✅ |
| Opening hours, customer feedback, activity log | | ✅ | ✅ |
| Create admins/DBAs, change anyone's role, manage admins | | | ✅ |

Safety rails built into the database: nobody can change their own role or active status, the last active DBA can't be removed or deactivated, and accounts without a role can't see anything private even if they can sign in. `akinboludave@gmail.com` is promoted to DBA automatically when that account is created.

Every change to menu items, categories, shifts, roles, accounts and opening hours is written to `activity_logs` by a database trigger (who, when, and old → new values). Nobody can edit or delete log entries from the app.

## Project layout

```
api/admin/users.ts            Vercel Function: create/update staff logins (secret key, server only)
scripts/import-legacy-menu.mjs  One-off copy of the menu from the old Supabase project
src/
  auth/AuthProvider.tsx       Session, profile and role
  lib/                        Supabase client, env/hosting rules, queries, formatting (UK time)
  pages/HomePage.tsx          Public website
  portal/                     Staff portal (code-split; customers never download it)
    pages/                    Dashboard, Roster, Menu, Categories, Staff, Hours, Feedback, Activity, Account
supabase/migrations/
  01_schema.sql               Tables, roles, triggers, RLS policies, storage bucket
  02_seed.sql                 Opening hours, categories, primary DBA promotion
vercel.json                   SPA routing, security headers, noindex for the portal
```

---

## Setup

### 1. Create the Supabase project

1. Create a new project at supabase.com (region: **London, eu-west-2**).
2. **SQL Editor →** paste and run `supabase/migrations/01_schema.sql`, then `02_seed.sql`.
   (Or with the CLI: `supabase link --project-ref <ref>` then `supabase db push`.)
3. **Authentication → Sign In / Providers → Email:**
   - turn **off** “Allow new users to sign up” (public sign-up must be disabled)
   - leave email + password enabled
4. **Authentication → URL Configuration:**
   - Site URL: `https://calabartastee.com`
   - Redirect URLs: `https://calabartastee.com/**`, `https://admin.calabartastee.com/**`, `http://localhost:3000/**`
5. **Authentication → Users → Add user → Create new user:** `akinboludave@gmail.com`, set a strong password, tick **Auto Confirm User**. It becomes `dba` automatically.
   (If you created it before running the SQL, just re-run `02_seed.sql`.)
6. Optional — bring the current menu across from the old project:
   ```bash
   LEGACY_SUPABASE_URL=https://fnwlnevaqxbabnvmxdtq.supabase.co \
   LEGACY_SUPABASE_ANON_KEY=<old anon key> \
   NEXT_PUBLIC_SUPABASE_URL=https://<new-ref>.supabase.co \
   SUPABASE_SECRET_KEY=<new secret key> \
   node scripts/import-legacy-menu.mjs --dry-run   # then again without --dry-run
   ```

### 2. Environment variables

Supabase → **Project Settings → API Keys**. Set these in **Vercel → Project → Settings → Environment Variables** (and in `.env.local` for local dev — see `.env.example`):

| Variable | Value | Exposed to browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | yes (safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key (`sb_publishable_…`) or legacy anon key | yes (safe — RLS protects data) |
| `SUPABASE_SECRET_KEY` | secret key (`sb_secret_…`) or legacy service_role key | **no — server only** |
| `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` | `.calabartastee.com` — **Production only** | yes |
| `NEXT_PUBLIC_ADMIN_ORIGIN` | empty in Phase 1; `https://admin.calabartastee.com` in Phase 2 | yes |

> The `NEXT_PUBLIC_` names are kept for consistency with Vercel/Supabase conventions; Vite is configured (`envPrefix` in `vite.config.ts`) to expose them. **Never** give the secret key a `NEXT_PUBLIC_` or `VITE_` prefix.
>
> `NEXT_PUBLIC_*` values are baked in at build time — after changing them, redeploy.

### 3. Deploy on Vercel

1. **Add New → Project →** import `skyford7/calabar-tastee`. Framework preset: **Vite** (picked up from `vercel.json`).
2. Add the environment variables above, then **Deploy**.
3. **Settings → Domains:** add `calabartastee.com` and `www.calabartastee.com` (redirect www → apex). Vercel shows the DNS records to create at names.co.uk:
   - `calabartastee.com` → **A** record to the IP address Vercel shows
   - `www` → **CNAME** to the value Vercel shows (e.g. `cname.vercel-dns.com`)
4. Sign in at `https://calabartastee.com/admin/login`.

The site is currently on Cloudflare Pages; once Vercel serves it correctly on the Vercel preview URL, switch the DNS records above and remove the Cloudflare Pages project.

### Phase 2 — move the portal to admin.calabartastee.com

No code changes needed:

1. Vercel → Domains → add `admin.calabartastee.com` (same project).
2. names.co.uk → add **CNAME** `admin` → value shown by Vercel.
3. Set `NEXT_PUBLIC_ADMIN_ORIGIN=https://admin.calabartastee.com` (Production) and redeploy.

After that, `calabartastee.com/admin/*` redirects to the subdomain, the portal is served at its root (`admin.calabartastee.com/roster`, …), and because the session cookie is scoped to `.calabartastee.com`, people stay signed in across both.

---

## Local development

```bash
npm install
cp .env.example .env.local     # fill in the Supabase URL + publishable key
npm run dev                    # http://localhost:3000  (portal at /admin)
```

`npm run dev` doesn't run the `/api` function. To test staff creation locally, use `npx vercel dev` (needs `SUPABASE_SECRET_KEY` in `.env.local`).

Other scripts: `npm run build`, `npm run typecheck`, `npm run lint`.

## Day-to-day

- **New staff member:** Admin → Staff → *Add team member*. A temporary password is generated and shown once; share it privately. They can change it under *My account*.
- **Forgotten password:** an admin resets it from the Staff page (no email flow by design).
- **Someone leaves:** *Deactivate* — they're blocked immediately and their shift history is kept.
- **Weekly roster:** Roster → *Copy last week* → adjust → *Publish*. Drafts are invisible to staff until published.
- **Hide a dish temporarily:** the eye icon on Menu items (deleting is permanent).

## Adding tables later

`01_schema.sql` revokes default privileges from `anon` and `authenticated`. For each new table: enable RLS, add policies using `public.is_team_member()`, `public.is_manager()` or `public.is_dba()`, and grant table privileges explicitly. Consider attaching `public.log_activity('<pk>', '<label column>')` for auditing.

## Known limitations (Phase 1)

- **Ordering** is via Uber Eats, phone and WhatsApp links. The `orders` / `order_items` tables exist (staff can read/write them under RLS) but there's no UI or online payment yet.
- **No notifications** when a roster is published.
- **Feedback form spam:** inserts are length-checked by the database but not rate-limited. If spam appears, add Cloudflare Turnstile or a Vercel Function with rate limiting in front of the insert.
- **Images:** uploads go to the public `menu-images` bucket (max 5 MB, JPEG/PNG/WebP/AVIF). Replacing a photo doesn't delete the old file.
