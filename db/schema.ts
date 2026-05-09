import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  surname: text("surname"),
  jobTitle: text("job_title"),
  role: text("role", { enum: ["super_admin", "admin", "staff"] }).notNull().default("staff"),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(true),
  canChangePassword: integer("can_change_password", { mode: "boolean" }).notNull().default(true),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isSuspended: integer("is_suspended", { mode: "boolean" }).notNull().default(false),
  suspendedBy: integer("suspended_by"),
  suspendedAt: text("suspended_at"),
  loginAttempts: integer("login_attempts").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const menuItems = sqliteTable("menu_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price").notNull(),
  imagePath: text("image_path"),
  category: text("category").notNull(),
  isPopular: integer("is_popular", { mode: "boolean" }).notNull().default(false),
  isSpicy: integer("is_spicy", { mode: "boolean" }).notNull().default(false),
  isPreorder: integer("is_preorder", { mode: "boolean" }).notNull().default(false),
  dietary: text("dietary"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const openingHours = sqliteTable("opening_hours", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  day: text("day").notNull().unique(), // monday, tuesday, etc.
  dayLabel: text("day_label").notNull(),
  openTime: text("open_time"), // e.g. "12:00", null = closed
  closeTime: text("close_time"), // e.g. "19:00", null = closed
  isClosed: integer("is_closed", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  username: text("username"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: integer("target_id"),
  targetName: text("target_name"),
  details: text("details"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export type OpeningHour = typeof openingHours.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
