import { router } from "./middleware";
import { localAuthRouter } from "./local-auth";
import { staffRouter } from "./staff-router";
import { menuRouter } from "./menu-router";
import { hoursRouter } from "./hours-router";
import { logsRouter } from "./logs-router";

export const appRouter = router({
  auth: localAuthRouter,
  staff: staffRouter,
  menu: menuRouter,
  hours: hoursRouter,
  logs: logsRouter,
});

export type AppRouter = typeof appRouter;
