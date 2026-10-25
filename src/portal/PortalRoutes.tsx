import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { portalPath } from "@/lib/env";
import { Allow, RequireTeam } from "./guards";
import { ConfirmProvider } from "./ui";
import { PortalLayout } from "./PortalLayout";
import { LoginPage } from "./LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MenuPage } from "./pages/MenuPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { RosterPage } from "./pages/RosterPage";
import { StaffPage } from "./pages/StaffPage";
import { HoursPage } from "./pages/HoursPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { ActivityPage } from "./pages/ActivityPage";
import { AccountPage } from "./pages/AccountPage";
import { TeamPage } from "./pages/TeamPage";
import { CenterNetPage } from "./pages/CenterNetPage";

/** Routes are relative, so this works under /admin/* and at the subdomain root. */
export default function PortalRoutes() {
  const { can } = useAuth();
  return (
    <ConfirmProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireTeam />}>
          <Route element={<PortalLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="center-net" element={<CenterNetPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="roster" element={<RosterPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route
              path="staff"
              element={
                <Allow when={can.manageStaff}>
                  <StaffPage />
                </Allow>
              }
            />
            <Route
              path="hours"
              element={
                <Allow when={can.manageHours}>
                  <HoursPage />
                </Allow>
              }
            />
            <Route
              path="feedback"
              element={
                <Allow when={can.viewFeedback}>
                  <FeedbackPage />
                </Allow>
              }
            />
            <Route
              path="activity"
              element={
                <Allow when={can.viewActivity}>
                  <ActivityPage />
                </Allow>
              }
            />
            <Route path="account" element={<AccountPage />} />
            <Route
              path="*"
              element={<Navigate to={portalPath("/")} replace />}
            />
          </Route>
        </Route>
      </Routes>
    </ConfirmProvider>
  );
}
