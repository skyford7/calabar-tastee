import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { portalPath } from "@/lib/env";
import { ForceChangeScreen } from "./CredentialForm";
import { EmptyState, PageLoader } from "./ui";

/** Any signed-in, active user with a role. Otherwise → login. */
export function RequireTeam() {
  const { loading, session, role, profile } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!session || !role) {
    return <Navigate to={portalPath("/login")} replace state={{ from: location.pathname }} />;
  }
  // A manager set/reset their sign-in details → they must choose their own first.
  if (profile?.must_change_credentials) return <ForceChangeScreen />;
  return <Outlet />;
}

/**
 * Hides a page from roles that can't use it. This is a UX guard only —
 * the database's RLS policies are what actually enforce access.
 */
export function Allow({ when, children }: { when: boolean; children: ReactNode }) {
  if (!when) {
    return (
      <EmptyState title="You don't have access to this page.">
        Ask an admin if you think this is a mistake.
      </EmptyState>
    );
  }
  return <>{children}</>;
}
