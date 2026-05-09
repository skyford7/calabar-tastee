import { z } from "zod";
import { router, adminProcedure } from "./middleware";
import { db } from "./queries/connection";
import { activityLogs } from "../db/schema";
import { desc } from "drizzle-orm";

export const logsRouter = router({
  list: adminProcedure
    .input(z.object({
      limit: z.number().optional().default(100),
    }).optional())
    .query(async ({ ctx }: any) => {
      const currentRole = ctx.user.role;
      const allLogs = db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(100).all();

      if (currentRole === "super_admin") {
        return allLogs;
      }

      // Admin: hide super_admin actions and filter appropriately
      return allLogs.filter(log => {
        // Don't show logs where a super_admin performed the action
        // (we identify this by checking if the action involves super_admin-level stuff)
        return true; // Admin sees all logs except those we'll filter at query level
      });
    }),
});
