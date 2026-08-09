import { z } from "zod";
import { publicQuery, createRouter } from "../middleware";

export const adminRouter = createRouter({
  stats: publicQuery.query(async ({ ctx }) => {
    const [
      menuCount,
      feedbackCount,
      newFeedbackCount,
    ] = await Promise.all([
      ctx.supabase.from("menu_items").select("*", { count: "exact", head: true }),
      ctx.supabase.from("feedback").select("*", { count: "exact", head: true }),
      ctx.supabase.from("feedback").select("*", { count: "exact", head: true }).eq("status", "new"),
    ]);

    return {
      totalMenuItems: menuCount.count || 0,
      totalFeedback: feedbackCount.count || 0,
      newFeedback: newFeedbackCount.count || 0,
    };
  }),

  logs: publicQuery
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(input?.limit || 50);

      if (error) throw new Error(error.message);
      return data || [];
    }),

  createLog: publicQuery
    .input(
      z.object({
        action: z.string().min(1),
        user_email: z.string().optional(),
        details: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("activity_logs")
        .insert({
          action: input.action,
          user_email: input.user_email || null,
          details: input.details || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),
});
