import { z } from "zod";
import { publicQuery, createRouter } from "../middleware";

export const menuRouter = createRouter({
  list: publicQuery.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("menu_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("menu_items")
        .select("*")
        .eq("id", input.id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        price: z.string().min(1),
        image_path: z.string().default("/placeholder.jpg"),
        category: z.string().min(1),
        is_popular: z.boolean().default(false),
        is_best_seller: z.boolean().default(false),
        is_spicy: z.boolean().default(false),
        is_preorder: z.boolean().default(false),
        dietary: z.string().optional(),
        sort_order: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("menu_items")
        .insert(input)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        image_path: z.string().optional(),
        category: z.string().optional(),
        is_popular: z.boolean().optional(),
        is_best_seller: z.boolean().optional(),
        is_spicy: z.boolean().optional(),
        is_preorder: z.boolean().optional(),
        dietary: z.string().optional(),
        sort_order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...update } = input;
      const { data, error } = await ctx.supabase
        .from("menu_items")
        .update(update)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("menu_items")
        .delete()
        .eq("id", input.id);

      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
