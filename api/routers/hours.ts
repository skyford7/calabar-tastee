import { z } from "zod";
import { publicQuery, createRouter } from "../middleware";

export const hoursRouter = createRouter({
  list: publicQuery.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("opening_hours")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }),

  update: publicQuery
    .input(
      z.object({
        day: z.string(),
        open_time: z.string().nullable(),
        close_time: z.string().nullable(),
        is_closed: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("opening_hours")
        .update({
          open_time: input.open_time,
          close_time: input.close_time,
          is_closed: input.is_closed,
        })
        .eq("day", input.day)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),
});
