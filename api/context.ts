import type { HonoRequest } from "hono";
import { db } from "./queries/connection";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { validateSession } from "./local-auth";

export async function createContext({ req }: { req: HonoRequest }) {
  const token = req.header("x-local-auth-token");
  let user = null;

  if (token) {
    const session = validateSession(token);
    if (session) {
      const found = db.select().from(users).where(eq(users.id, session.userId)).get();
      if (found && !found.isSuspended) {
        user = {
          id: found.id,
          username: found.username,
          role: found.role,
          firstName: found.firstName,
          surname: found.surname,
          canChangePassword: found.canChangePassword,
        };
      }
    }
  }

  return { user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
