import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { loginWithSecret, LoginError } from "@/lib/authApi";
import { permissionsFor, type Permissions } from "@/lib/permissions";
import type { AppRole, Profile } from "@/lib/types";

type AuthState = {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** null when signed out, suspended, or no role assigned. */
  role: AppRole | null;
  can: Permissions;
  /** Username + password or access code. */
  signIn: (username: string, secret: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

type Member = { profile: Profile | null; role: AppRole | null };

async function fetchMember(uid: string): Promise<Member> {
  const [p, r] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
  ]);
  if (p.error) throw p.error;
  const profile = (p.data as Profile | null) ?? null;
  const role = profile?.is_active ? ((r.data?.role as AppRole | undefined) ?? null) : null;
  return { profile, role };
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // Keep this callback synchronous — calling Supabase from inside it can deadlock.
      setSession(next);
      if (event === "SIGNED_OUT") qc.clear();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  const userId = session?.user.id ?? null;

  const member = useQuery({
    queryKey: ["auth-member", userId],
    enabled: !!userId,
    queryFn: () => fetchMember(userId!),
    // Re-check often so a role change (or suspension) made by a manager reaches an open session
    // within seconds instead of waiting for the next sign-in.
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: "always",
  });

  const signIn = useCallback(
    async (username: string, secret: string) => {
      const tokens = await loginWithSecret(username, secret);
      const { data, error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error || !data.user) throw new LoginError(error?.message ?? "Could not start your session.");
      const m = await fetchMember(data.user.id);
      if (!m.role) {
        await supabase.auth.signOut();
        throw new LoginError("This account doesn't have portal access. Please ask your manager.");
      }
      qc.setQueryData(["auth-member", data.user.id], m);
    },
    [qc]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const role = member.data?.role ?? null;

  const value = useMemo<AuthState>(
    () => ({
      loading: !sessionLoaded || (!!userId && member.isPending),
      session,
      profile: member.data?.profile ?? null,
      role,
      can: permissionsFor(role),
      signIn,
      signOut,
      refresh: async () => {
        await member.refetch();
      },
    }),
    [sessionLoaded, userId, member, session, role, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
