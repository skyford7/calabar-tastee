import { z } from "zod";
import { publicQuery, createRouter } from "../middleware";

export const feedbackRouter = createRouter({
  submit: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email(),
        comment: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("feedback")
        .insert({
          name: input.name,
          phone: input.phone || null,
          email: input.email,
          comment: input.comment,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  list: publicQuery.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }),

  markRead: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("feedback")
        .update({ status: "read" })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("feedback")
        .delete()
        .eq("id", input.id);

      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
