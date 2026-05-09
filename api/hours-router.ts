import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "./middleware";
import { db } from "./queries/connection";
import { openingHours, activityLogs } from "../db/schema";
import { eq } from "drizzle-orm";

export const hoursRouter = router({
  // Public: get all opening hours
  list: publicProcedure
    .query(async () => {
      return db.select().from(openingHours).all();
    }),

  // Public: check if currently open (used by frontend badge)
  status: publicProcedure
    .query(async () => {
      const hours = db.select().from(openingHours).all();
      const now = new Date();
      const ukTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const currentDay = dayNames[ukTime.getDay()];
      const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();

      const todayHours = hours.find(h => h.day === currentDay);
      if (!todayHours || todayHours.isClosed || !todayHours.openTime || !todayHours.closeTime) {
        return { status: "closed", label: "We're currently closed. See opening hours below", todayHours };
      }

      const [openH, openM] = todayHours.openTime.split(":").map(Number);
      const [closeH, closeM] = todayHours.closeTime.split(":").map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      if (currentMinutes < openMinutes - 45) {
        return { status: "closed", label: "We're currently closed. See opening hours below", todayHours };
      }
      if (currentMinutes >= openMinutes - 45 && currentMinutes < openMinutes) {
        return { status: "opening_soon", label: "Opening Soon", todayHours };
      }
      if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes - 45) {
        return { status: "open", label: "We're now opened", todayHours };
      }
      if (currentMinutes > closeMinutes - 45 && currentMinutes <= closeMinutes) {
        return { status: "closing_soon", label: "Closing Soon", todayHours };
      }
      return { status: "closed", label: "We're currently closed. See opening hours below", todayHours };
    }),

  // Admin: update opening hours
  update: adminProcedure
    .input(z.object({
      day: z.string(),
      openTime: z.string().nullable(),
      closeTime: z.string().nullable(),
      isClosed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }: any) => {
      db.update(openingHours).set({
        openTime: input.openTime,
        closeTime: input.closeTime,
        isClosed: input.isClosed,
        updatedAt: new Date(),
      }).where(eq(openingHours.day, input.day)).run();

      db.insert(activityLogs).values({
        userId: ctx.user.id,
        username: ctx.user.username,
        action: "updated_opening_hours",
        targetType: "setting",
        targetName: input.day,
        details: `Updated ${input.day}: ${input.isClosed ? "Closed" : `${input.openTime} - ${input.closeTime}`}`,
      }).run();

      return { success: true };
    }),
});
