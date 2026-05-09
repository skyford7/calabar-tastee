import { useCallback } from "react";
import { trpc } from "@/providers/trpc";

interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
  isSuspended?: boolean;
  locked?: boolean;
  mustChangePassword?: boolean;
}

export function useLocalAuth() {
  const utils = trpc.useUtils();
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") || "" : "";
  
  const { data: user, isLoading } = trpc.auth.me.useQuery(
    { token },
    { enabled: !!token }
  );

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data: LoginResponse) => {
      if (data.success && data.token) {
        localStorage.setItem("admin_token", data.token);
        window.location.reload();
      }
    },
    onError: (err) => {
      console.error("Login failed:", err);
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("admin_token");
      window.location.href = "/admin";
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      localStorage.removeItem("admin_token");
      window.location.reload();
    },
  });

  const login = useCallback((username: string, password: string) => {
    loginMutation.mutate({ username, password });
  }, [loginMutation]);

  const logout = useCallback(() => {
    logoutMutation.mutate({ token });
  }, [logoutMutation, token]);

  const changePassword = useCallback((newPassword: string, confirmPassword: string) => {
    changePasswordMutation.mutate({ token, newPassword, confirmPassword });
  }, [changePasswordMutation, token]);

  const loginData = loginMutation.data as LoginResponse | undefined;

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
    isAdmin: user?.role === "admin" || user?.role === "super_admin",
    isSuperAdmin: user?.role === "super_admin",
    mustChangePassword: user?.mustChangePassword || false,
    login,
    logout,
    changePassword,
    loginError: loginData?.message || null,
    loginLoading: loginMutation.isPending,
    isSuspended: loginData?.isSuspended || false,
    isLocked: loginData?.locked || false,
  };
}
