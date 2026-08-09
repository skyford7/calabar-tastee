import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./routers/auth";
import { menuRouter } from "./routers/menu";
import { hoursRouter } from "./routers/hours";
import { feedbackRouter } from "./routers/feedback";
import { adminRouter } from "./routers/admin";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  menu: menuRouter,
  hours: hoursRouter,
  feedback: feedbackRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
