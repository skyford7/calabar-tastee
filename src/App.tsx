import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { ADMIN_ORIGIN, isAdminHost } from "@/lib/env";
import { HomePage } from "@/pages/HomePage";
import { PageLoader } from "@/portal/ui";

// The portal is code-split so customers never download it.
const PortalRoutes = lazy(() => import("@/portal/PortalRoutes"));

function PortalFallback() {
  return <PageLoader />;
}

/** The public site has no /admin: forward old links to admin.calabartastee.com. */
function RedirectToAdminHost() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const rest = pathname.replace(/^\/(admin|login)/, "") || "/";
    const to = pathname.startsWith("/login") ? `/login${rest === "/" ? "" : rest}` : rest;
    window.location.replace(`${ADMIN_ORIGIN}${to}${search}`);
  }, [pathname, search]);
  return <PortalFallback />;
}

export default function App() {
  // admin.calabartastee.com — only the portal is served, at the root.
  if (isAdminHost) {
    return (
      <Routes>
        <Route
          path="/*"
          element={
            <Suspense fallback={<PortalFallback />}>
              <PortalRoutes />
            </Suspense>
          }
        />
      </Routes>
    );
  }

  // calabartastee.com — public site only.
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin/*" element={<RedirectToAdminHost />} />
      <Route path="/login" element={<RedirectToAdminHost />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
