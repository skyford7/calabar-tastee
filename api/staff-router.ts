import { z } from "zod";
import { router, publicProcedure, adminProcedure, superAdminProcedure } from "./middleware";
import { db } from "./queries/connection";
import { users, activityLogs } from "../db/schema";
import { eq, not, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const staffRouter = router({
  // List all visible users (super admin hidden from admin/staff)
  list: adminProcedure
    .query(async ({ ctx }: any) => {
      const currentRole = ctx.user.role;
      if (currentRole === "super_admin") {
        return db.select().from(users).all();
      }
      // Admin can see everyone except super_admin
      return db.select().from(users).where(not(eq(users.role, "super_admin"))).all();
    }),

  // Get single user
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.select().from(users).where(eq(users.id, input.id)).get();
    }),

  // Create user (admin or super_admin only)
  create: adminProcedure
    .input(z.object({
      firstName: z.string().min(1),
      surname: z.string().optional(),
      jobTitle: z.string().optional(),
      role: z.enum(["admin", "staff"]),
      username: z.string().min(1),
      tempPassword: z.string().min(6),
      mustChangePassword: z.boolean().default(true),
      canChangePassword: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }: any) => {
      // Only super_admin can create admin
      if (input.role === "admin" && ctx.user.role !== "super_admin") {
        return { success: false, message: "Only super admin can create admin accounts" };
      }

      // Check username uniqueness
      const existing = db.select().from(users).where(eq(users.username, input.username)).get();
      if (existing) {
        return { success: false, message: "Username already exists" };
      }

      const newUser = db.insert(users).values({
        firstName: input.firstName,
        surname: input.surname || null,
        jobTitle: input.jobTitle || null,
        role: input.role,
        username: input.username,
        passwordHash: bcrypt.hashSync(input.tempPassword, 10),
        mustChangePassword: input.mustChangePassword,
        canChangePassword: input.canChangePassword,
        isActive: true,
        isSuspended: false,
        loginAttempts: 0,
      }).returning().get();

      // Log action
      db.insert(activityLogs).values({
        userId: ctx.user.id,
        username: ctx.user.username,
        action: "created_user",
        targetType: "user",
        targetId: newUser.id,
        targetName: newUser.username,
        details: `Created ${input.role}: ${input.firstName} (${input.username})`,
      }).run();

      return { success: true, user: newUser };
    }),

  // Update user (name, details only - staff can edit their own name)
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      surname: z.string().optional(),
      jobTitle: z.string().optional(),
      username: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }: any) => {
      const targetUser = db.select().from(users).where(eq(users.id, input.id)).get();
      if (!targetUser) return { success: false, message: "User not found" };

      // Admin cannot modify other admins (only super_admin can)
      if (targetUser.role === "admin" && ctx.user.role !== "super_admin" && targetUser.id !== ctx.user.id) {
        return { success: false, message: "Only super admin can modify admin accounts" };
      }

      const updates: any = {};
      if (input.firstName) updates.firstName = input.firstName;
      if (input.surname !== undefined) updates.surname = input.surname || null;
      if (input.jobTitle !== undefined) updates.jobTitle = input.jobTitle || null;
      if (input.username) updates.username = input.username;

      db.update(users).set(updates).where(eq(users.id, input.id)).run();

      db.insert(activityLogs).values({
        userId: ctx.user.id,
        username: ctx.user.username,
        action: "updated_user",
        targetType: "user",
        targetId: input.id,
        targetName: targetUser.username,
        details: `Updated user: ${targetUser.username}`,
      }).run();

      return { success: true };
    }),

  // Reset password
  resetPassword: adminProcedure
    .input(z.object({
      id: z.number(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }: any) => {
      const targetUser = db.select().from(users).where(eq(users.id, input.id)).get();
      if (!targetUser) return { success: false, message: "User not found" };

      // Admin cannot reset other admin passwords (only super_admin can)
      if (targetUser.role === "admin" && ctx.user.role !== "super_admin" && targetUser.id !== ctx.user.id) {
        return { success: false, message: "Only super admin can reset admin passwords" };
      }

      db.update(users).set({
        passwordHash: bcrypt.hashSync(input.newPassword, 10),
        mustChangePassword: true,
        loginAttempts: 0,
      }).where(eq(users.id, input.id)).run();

      db.insert(activityLogs).values({
        userId: ctx.user.id,
        username: ctx.user.username,
        action: "reset_password",
        targetType: "user",
        targetId: input.id,
        targetName: targetUser.username,
        details: `Reset password for: ${targetUser.username}`,
      }).run();

      return { success: true };
    }),

  // Suspend/unsuspend user
  suspend: adminProcedure
    .input(z.object({
      id: z.number(),
      suspended: z.boolean(),
    }))
    .mutation(async ({ ctx, input }: any) => {
      const targetUser = db.select().from(users).where(eq(users.id, input.id)).get();
      if (!targetUser) return { success: false, message: "User not found" };

      // Admin cannot suspend other admins
      if (targetUser.role === "admin" && ctx.user.role !== "super_admin") {
        return { success: false, message: "Only super admin can suspend admin accounts" };
      }

      db.update(users).set({
        isSuspended: input.suspended,
        suspendedBy: input.suspended ? ctx.user.id : null,
        suspendedAt: input.suspended ? new Date().toISOString() : null,
      }).where(eq(users.id, input.id)).run();

      db.insert(activityLogs).values({
        userId: ctx.user.id,
        username: ctx.user.username,
        action: input.suspended ? "suspended_user" : "reactivated_user",
        targetType: "user",
        targetId: input.id,
        targetName: targetUser.username,
        details: `${input.suspended ? "Suspended" : "Reactivated"} user: ${targetUser.username}`,
      }).run();

      return { success: true };
    }),

  // Toggle canChangePassword
  togglePasswordChange: adminProcedure
    .input(z.object({
      id: z.number(),
      canChange: z.boolean(),
    }))
    .mutation(async ({ ctx, input }: any) => {
      db.update(users).set({ canChangePassword: input.canChange }).where(eq(users.id, input.id)).run();
      return { success: true };
    }),

  // Delete user (super_admin only for admins, admin can delete staff)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }: any) => {
      const targetUser = db.select().from(users).where(eq(users.id, input.id)).get();
      if (!targetUser) return { success: false, message: "User not found" };

      if (targetUser.role === "admin" && ctx.user.role !== "super_admin") {
        return { success: false, message: "Only super admin can delete admin accounts" };
      }

      db.delete(users).where(eq(users.id, input.id)).run();

      db.insert(activityLogs).values({
        userId: ctx.user.id,
        username: ctx.user.username,
        action: "deleted_user",
        targetType: "user",
        targetId: input.id,
        targetName: targetUser.username,
        details: `Deleted user: ${targetUser.username}`,
      }).run();

      return { success: true };
    }),
});
