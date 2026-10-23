import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { portalPath } from "@/lib/env";
import { EmptyState, Spinner } from "./ui";

/** Any signed-in, active user with a role. Otherwise → login. */
export function RequireTeam() {
  const { loading, session, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1410]">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }
  if (!session || !role) {
    return (
      <Navigate
        to={portalPath("/login")}
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  return <Outlet />;
}

/**
 * Hides a page from roles that can't use it. This is a UX guard only —
 * the database's RLS policies are what actually enforce access.
 */
export function Allow({
  when,
  children,
}: {
  when: boolean;
  children: ReactNode;
}) {
  if (!when) {
    return (
      <EmptyState title="You don't have access to this page.">
        Ask an admin if you think this is a mistake.
      </EmptyState>
    );
  }
  return <>{children}</>;
}
