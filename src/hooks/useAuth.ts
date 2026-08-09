import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
  email: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || "",
          role: "admin",
        });
      } else {
        localStorage.removeItem("admin_token");
        setUser(null);
      }
    } catch {
      localStorage.removeItem("admin_token");
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        localStorage.setItem("admin_token", session.access_token);
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          role: "admin",
        });
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("admin_token");
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("admin_token");
    setUser(null);
    window.location.reload();
  }, []);

  return { user, loading, logout, refresh: checkSession };
}
