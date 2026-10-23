import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { ADMIN_ORIGIN, isAdminHost, portalPath } from "@/lib/env";
import { HomePage } from "@/pages/HomePage";
import { Spinner } from "@/portal/ui";

// The portal is code-split so customers never download it.
const PortalRoutes = lazy(() => import("@/portal/PortalRoutes"));

function PortalFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1410]">
      <Spinner className="h-10 w-10" />
    </div>
  );
}

/** Phase 2: /admin/* on the main site forwards to admin.calabartastee.com/*. */
function RedirectToAdminHost() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const rest = pathname.replace(/^\/admin/, "") || "/";
    window.location.replace(`${ADMIN_ORIGIN}${rest}${search}`);
  }, [pathname, search]);
  return <PortalFallback />;
}

export default function App() {
  const portal = (
    <Suspense fallback={<PortalFallback />}>
      <PortalRoutes />
    </Suspense>
  );

  // admin.calabartastee.com — only the portal is served, at the root.
  if (isAdminHost) {
    return (
      <Routes>
        <Route path="/*" element={portal} />
      </Routes>
    );
  }

  // calabartastee.com — public site, plus the portal at /admin (Phase 1) or a redirect (Phase 2).
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/admin/*"
        element={ADMIN_ORIGIN ? <RedirectToAdminHost /> : portal}
      />
      {/* Old links */}
      <Route
        path="/login"
        element={<Navigate to={portalPath("/login")} replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
