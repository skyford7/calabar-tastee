import { useState } from "react";
import { Routes, Route, Navigate } from "react-router";
import { TRPCProvider } from "@/providers/trpc";
import HomePage from "./pages/HomePage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminLayout from "./pages/AdminLayout";
import DashboardHome from "./pages/admin/DashboardHome";
import StaffPage from "./pages/admin/StaffPage";
import MenuPage from "./pages/admin/MenuPage";
import HoursPage from "./pages/admin/HoursPage";
import LogsPage from "./pages/admin/LogsPage";
import FeedbackPage from "./pages/admin/FeedbackPage";
import { useLocalAuth } from "./hooks/useLocalAuth";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, isAdmin, mustChangePassword } = useLocalAuth();
  if (isLoading) return <div className="min-h-screen bg-[#1a1410] flex items-center justify-center"><div className="text-amber-500">Loading...</div></div>;
  if (!isLoggedIn) return <Navigate to="/admin" replace />;
  if (mustChangePassword) return <Navigate to="/admin/change-password" replace />;
  if (!isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function ChangePasswordGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, mustChangePassword } = useLocalAuth();
  if (isLoading) return <div className="min-h-screen bg-[#1a1410] flex items-center justify-center"><div className="text-amber-500">Loading...</div></div>;
  if (!isLoggedIn) return <Navigate to="/admin" replace />;
  if (!mustChangePassword) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

function ChangePasswordPage() {
  const { changePassword, logout } = useLocalAuth();
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPass.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPass !== confirmPass) { setError("Passwords do not match"); return; }
    changePassword(newPass, confirmPass);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#1a1410] flex items-center justify-center p-4">
        <div className="bg-[#231a14] border border-amber-900/30 rounded-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Password Updated!</h2>
          <p className="text-amber-100/60 mb-6">Your password has been changed successfully. Please log in again.</p>
          <button onClick={logout} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-full">Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1410] flex items-center justify-center p-4">
      <div className="bg-[#231a14] border border-amber-900/30 rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-2">Change Password</h2>
        <p className="text-amber-100/60 mb-6">Please create a new password for your account.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-amber-100/60 mb-1">New Password</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" required />
          </div>
          <div>
            <label className="block text-sm text-amber-100/60 mb-1">Confirm Password</label>
            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" required />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-semibold">Update Password</button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TRPCProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/change-password" element={<ChangePasswordGuard><ChangePasswordPage /></ChangePasswordGuard>} />
        <Route path="/admin/dashboard" element={<AdminGuard><AdminLayout><DashboardHome /></AdminLayout></AdminGuard>} />
        <Route path="/admin/staff" element={<AdminGuard><AdminLayout><StaffPage /></AdminLayout></AdminGuard>} />
        <Route path="/admin/menu" element={<AdminGuard><AdminLayout><MenuPage /></AdminLayout></AdminGuard>} />
        <Route path="/admin/hours" element={<AdminGuard><AdminLayout><HoursPage /></AdminLayout></AdminGuard>} />
        <Route path="/admin/logs" element={<AdminGuard><AdminLayout><LogsPage /></AdminLayout></AdminGuard>} />
        <Route path="/admin/feedback" element={<AdminGuard><AdminLayout><FeedbackPage /></AdminLayout></AdminGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TRPCProvider>
  );
}
