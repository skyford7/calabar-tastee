# Cloudflare Pages Deployment Guide

## Prerequisites

- A [Cloudflare](https://cloudflare.com) account (free tier works)
- Node.js 18+ installed locally

## Quick Deploy (3 commands)

```bash
# 1. Install dependencies
npm install

# 2. Build the frontend
npm run build

# 3. Authenticate with Cloudflare (one-time)
npx wrangler login

# 4. Deploy to Cloudflare Pages
npx wrangler pages deploy dist/public
```

After deployment, Wrangler will output a URL like:
`https://calabar-tastee.pages.dev`

## What Gets Deployed

- **Frontend**: Static React app (menu, hours, reviews, contact form)
- **API**: Cloudflare Pages Functions at `/api/trpc/*` (tRPC backend)
- **Database**: Supabase (already configured - no setup needed)

## Admin Access

After deploying, visit:
- `https://your-site.pages.dev/admin/login`

**Login credentials:**
- Email: `admin@calabartastee.com`
- Password: `password`

The admin dashboard lets you manage menu items, view feedback, and edit opening hours.

## Environment Variables (Optional)

If you want to change the Supabase project later, set these in the Cloudflare Pages dashboard:

| Variable | Current Value |
|----------|--------------|
| SUPABASE_URL | `https://fnwlnevaqxbabnvmxdtq.supabase.co` |
| SUPABASE_ANON_KEY | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2xuZXZhcXhiYWJudm14ZHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODYyMTksImV4cCI6MjA5NjE2MjIxOX0.ODpjh8_Qb3k4lymsFTu6AApiWwPg0ZZLbykbpI_NGnw` |

## Project Structure

```
app/
  dist/public/      # Frontend build output (deployed as static assets)
  functions/        # Cloudflare Pages Functions (API backend)
    api/trpc/[[path]].ts   # tRPC API handler
    [[path]].ts           # SPA routing (serves index.html for all routes)
  src/              # Frontend source code
  api/              # Backend source code (tRPC routers)
  public/           # Static assets (images, QR code)
```

## Troubleshooting

### "No such account" error
Run `npx wrangler login` first to authenticate with Cloudflare.

### API returns 404
Make sure the `functions/` directory is in the project root when running `wrangler pages deploy`.

### Menu/hours not loading
Check browser DevTools Network tab. The API calls should go to `/api/trpc`. If the site is deployed, the API runs on the same domain.
