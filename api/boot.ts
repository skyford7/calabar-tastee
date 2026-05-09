import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Image upload endpoint
app.post("/api/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  if (!file) return c.json({ success: false, message: "No file" }, 400);

  const uploadsDir = join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  const filename = `${Date.now()}-${file.name.replace(/\s/g, "-")}`;
  const filepath = join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(filepath, buffer);

  return c.json({ success: true, path: `/uploads/${filename}` });
});

app.use("/api/trpc/*", async (c) => {
  let req = c.req.raw;

  // Strip trpc-accept header — httpBatchLink sends "application/jsonl" which
  // causes fetchRequestHandler to reject single (non-batch) requests with 400
  const trpcAccept = req.headers.get("trpc-accept");
  if (trpcAccept) {
    const headers = new Headers(req.headers);
    headers.delete("trpc-accept");
    req = new Request(req.url, { method: req.method, headers, body: req.body });
  }

  // Unwrap tRPC v11's { json: {...} } wrapper from request bodies
  function unwrapJson(obj: unknown): unknown {
    if (obj && typeof obj === "object" && "json" in obj) {
      return (obj as any).json;
    }
    return obj;
  }

  if (req.method === "POST" && req.headers.get("content-type")?.startsWith("application/json")) {
    try {
      const text = await req.text();
      const body = JSON.parse(text);
      let newBody: unknown;
      if (body && typeof body === "object") {
        const keys = Object.keys(body);
        const isBatch = keys.length > 0 && keys.every(k => /^\d+$/.test(k));
        if (isBatch) {
          const unwrapped: Record<string, unknown> = {};
          for (const key of keys) unwrapped[key] = unwrapJson(body[key]);
          newBody = unwrapped;
        } else if ("json" in body) {
          newBody = body.json;
        } else {
          newBody = body;
        }
        req = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(newBody),
        });
      }
    } catch {
      // If body can't be parsed, pass through as-is
    }
  }

  const res = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ req }: any) => createContext({ req: c.req }),
  });

  // Wrap response BACK into tRPC v11 format (result.data → result.data.json)
  if (res.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = await res.json();
      const wrapped = wrapResponseV11(body);
      return new Response(JSON.stringify(wrapped), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    } catch {
      // If response can't be parsed, return original
    }
  }

  return res;
});

function wrapResponseV11(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const keys = Object.keys(obj);
  const isBatch = keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
  if (isBatch) {
    const wrapped: Record<string, unknown> = {};
    for (const key of keys) wrapped[key] = wrapResponseV11((obj as any)[key]);
    return wrapped;
  }
  if (
    "result" in obj &&
    (obj as any).result?.data &&
    !("json" in (obj as any).result.data)
  ) {
    return {
      ...obj,
      result: {
        ...(obj as any).result,
        data: { json: (obj as any).result.data },
      },
    };
  }
  return obj;
}
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  // Auto-create tables and seed on first start
  const Database = (await import("better-sqlite3")).default;
  const { hashSync } = await import("bcryptjs");
  const dbPath = process.env.DATABASE_URL || "./sqlite.db";
  const db = new Database(dbPath);

  try {
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        surname TEXT,
        job_title TEXT,
        role TEXT NOT NULL DEFAULT 'staff',
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        must_change_password INTEGER NOT NULL DEFAULT 1,
        can_change_password INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_suspended INTEGER NOT NULL DEFAULT 0,
        suspended_by INTEGER,
        suspended_at TEXT,
        login_attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price TEXT NOT NULL,
        image_path TEXT,
        category TEXT NOT NULL,
        is_popular INTEGER NOT NULL DEFAULT 0,
        is_spicy INTEGER NOT NULL DEFAULT 0,
        is_preorder INTEGER NOT NULL DEFAULT 0,
        dietary TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS opening_hours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL UNIQUE,
        day_label TEXT NOT NULL,
        open_time TEXT,
        close_time TEXT,
        is_closed INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        target_name TEXT,
        details TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      );
    `);

    // Seed default admin if no users exist
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    if (userCount.count === 0) {
      db.prepare("INSERT OR REPLACE INTO users (first_name, surname, role, username, password_hash, must_change_password, can_change_password, is_active, is_suspended, login_attempts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run("Dave", "Akinbolu", "super_admin", "akinboludave@gmail.com", hashSync("davester2005", 10), 0, 1, 1, 0, 0);
      db.prepare("INSERT OR REPLACE INTO users (first_name, role, username, password_hash, must_change_password, can_change_password, is_active, is_suspended, login_attempts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run("Admin", "admin", "admin", hashSync("admin123", 10), 0, 1, 1, 0, 0);

      const hours = [
        { day: "monday", dayLabel: "Monday", openTime: "12:00", closeTime: "19:00", isClosed: 0 },
        { day: "tuesday", dayLabel: "Tuesday", openTime: "12:00", closeTime: "19:00", isClosed: 0 },
        { day: "wednesday", dayLabel: "Wednesday", openTime: "12:00", closeTime: "19:00", isClosed: 0 },
        { day: "thursday", dayLabel: "Thursday", openTime: "12:00", closeTime: "19:00", isClosed: 0 },
        { day: "friday", dayLabel: "Friday", openTime: "12:00", closeTime: "19:00", isClosed: 0 },
        { day: "saturday", dayLabel: "Saturday", openTime: "12:00", closeTime: "19:00", isClosed: 0 },
        { day: "sunday", dayLabel: "Sunday", openTime: null, closeTime: null, isClosed: 1 },
      ];
      const insertHour = db.prepare("INSERT OR IGNORE INTO opening_hours (day, day_label, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?)");
      for (const h of hours) insertHour.run(h.day, h.dayLabel, h.openTime, h.closeTime, h.isClosed);

      console.log("Database initialized with default data");
    }
  } catch (e) {
    console.error("DB init error:", e);
  }
  db.close();

  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
