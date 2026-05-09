import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "./middleware";
import { db } from "./queries/connection";
import { users, sessions } from "../db/schema";
import { eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

function createSession(userId: number, role: string): string {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  db.insert(sessions).values({
    token,
    userId,
    role,
    expiresAt: expires,
  }).run();
  return token;
}

export function validateSession(token: string) {
  const session = db.select().from(sessions)
    .where(eq(sessions.token, token))
    .get();
  if (!session) return null;
  if (new Date() > session.expiresAt) {
    db.delete(sessions).where(eq(sessions.token, token)).run();
    return null;
  }
  return { userId: session.userId, role: session.role, expires: session.expiresAt };
}

export function clearSession(token: string) {
  db.delete(sessions).where(eq(sessions.token, token)).run();
}

export const localAuthRouter = router({
  login: publicProcedure
    .input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mutation(async ({ input }: any) => {
      const user = db.select().from(users).where(eq(users.username, input.username)).get();
      
      if (!user) {
        return { success: false, message: "Invalid credentials", mustChangePassword: false, isSuspended: false };
      }

      if (user.isSuspended) {
        return { success: false, message: "Your access has been revoked. Contact your admin to reactivate your account.", mustChangePassword: false, isSuspended: true };
      }

      if (user.loginAttempts >= 3) {
        return { success: false, message: "If you have forgotten your login credentials, contact your admin or database administrator.", mustChangePassword: false, isSuspended: false, locked: true };
      }

      const valid = bcrypt.compareSync(input.password, user.passwordHash);
      if (!valid) {
        db.update(users).set({ loginAttempts: user.loginAttempts + 1 }).where(eq(users.id, user.id)).run();
        return { success: false, message: "Invalid credentials", mustChangePassword: false, isSuspended: false };
      }

      db.update(users).set({ loginAttempts: 0 }).where(eq(users.id, user.id)).run();

      const token = createSession(user.id, user.role);
      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          firstName: user.firstName,
          mustChangePassword: user.mustChangePassword,
        },
        mustChangePassword: user.mustChangePassword,
      };
    }),

  changePassword: publicProcedure
    .input(z.object({
      token: z.string(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6),
      confirmPassword: z.string().min(6),
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mutation(async ({ input }: any) => {
      if (input.newPassword !== input.confirmPassword) {
        return { success: false, message: "Passwords do not match" };
      }

      const session = validateSession(input.token);
      if (!session) return { success: false, message: "Session expired" };

      const user = db.select().from(users).where(eq(users.id, session.userId)).get();
      if (!user) return { success: false, message: "User not found" };

      if (!user.canChangePassword) {
        return { success: false, message: "You are not allowed to change your password. Contact your admin." };
      }

      if (input.currentPassword && !bcrypt.compareSync(input.currentPassword, user.passwordHash)) {
        return { success: false, message: "Current password is incorrect" };
      }

      db.update(users).set({
        passwordHash: bcrypt.hashSync(input.newPassword, 10),
        mustChangePassword: false,
      }).where(eq(users.id, user.id)).run();

      return { success: true, message: "Password updated successfully" };
    }),

  me: publicProcedure
    .input(z.object({ token: z.string() }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .query(async ({ input }: any) => {
      const session = validateSession(input.token);
      if (!session) return null;

      const user = db.select().from(users).where(eq(users.id, session.userId)).get();
      if (!user || user.isSuspended) return null;

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        surname: user.surname,
        canChangePassword: user.canChangePassword,
        mustChangePassword: user.mustChangePassword,
      };
    }),

  logout: publicProcedure
    .input(z.object({ token: z.string() }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mutation(async ({ input }: any) => {
      clearSession(input.token);
      return { success: true };
    }),
});
