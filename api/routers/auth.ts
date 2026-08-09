import { z } from "zod";
import { publicQuery, createRouter } from "../middleware";
import { getSupabaseClient } from "../lib/supabase";

export const authRouter = createRouter({
  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (error) throw new Error(error.message);
      return {
        success: true,
        token: data.session?.access_token,
        user: data.user,
      };
    }),

  register: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
      });

      if (error) throw new Error(error.message);
      return {
        success: true,
        user: data.user,
      };
    }),

  verify: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser(input.token);

      if (error || !data.user) throw new Error("Invalid token");
      return {
        success: true,
        user: data.user,
      };
    }),

  logout: publicQuery.mutation(async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    return { success: true };
  }),
});
