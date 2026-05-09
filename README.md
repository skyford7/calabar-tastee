# Calabar Tastee

Authentic Nigerian restaurant website with admin dashboard, built for Calabar Tastee at 185 Dalry Road, Edinburgh.

## Features

- **Public Website** - Hero, menu display with filters, opening hours status, contact info, Just Eat/Deliveroo ordering links, customer feedback form
- **Admin Dashboard** - Staff management, menu CRUD with image upload, editable opening hours, activity logs
- **Opening Hours Status** - Automatically shows "Opening Soon / We're Opened / Closing Soon / Closed" based on UK time
- **Local Authentication** - Username/password login with bcrypt, role-based access (super_admin, admin, staff)
- **Image Upload** - Direct image upload for menu items via the admin panel

## Tech Stack

- React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Hono + tRPC 11.x + Drizzle ORM + SQLite (better-sqlite3)
- Local session-based authentication

## Getting Started

```bash
npm install
npm run db:push      # Sync database schema
npm run seed         # Seed default admin account
npm run dev          # Start dev server at http://localhost:3000
```

## Default Login

- Username: `admin`
- Password: `admin123`
- You'll be prompted to change password on first login.

## Build for Production

```bash
npm run build        # Build frontend + backend
npm start            # Start production server
```

## Deploy on Render (Free Tier)

1. Push to GitHub
2. Create a new **Web Service** on Render (not Static Site)
3. Connect your GitHub repo
4. Set build command: `npm install && npm run build`
5. Set start command: `npm start`
6. Add environment variable: `APP_SECRET` (any random string for session signing)
