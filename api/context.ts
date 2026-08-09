import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { getSupabaseClient, getSupabaseClientWithAuth } from "./lib/supabase";

export type User = {
  id: string;
  email: string;
  role?: string;
};

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  supabase: ReturnType<typeof getSupabaseClient>;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const token = opts.req.headers.get("x-supabase-auth") || "";

  const user = await (async (): Promise<User | undefined> => {
    if (!token) return undefined;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        return {
          id: data.user.id,
          email: data.user.email || "",
          role: "admin",
        };
      }
    } catch {
      // ignore
    }
    return undefined;
  })();

  const supabase = user ? getSupabaseClientWithAuth(token) : getSupabaseClient();

  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    user,
    supabase,
  };
}
