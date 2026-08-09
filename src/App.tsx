import { Routes, Route, Navigate } from "react-router";
import { HomePage } from "./pages/HomePage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { Dashboard } from "./pages/admin/Dashboard";
import { MenuManager } from "./pages/admin/MenuManager";
import { FeedbackViewer } from "./pages/admin/FeedbackViewer";
import { HoursEditor } from "./pages/admin/HoursEditor";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<Dashboard />} />
      <Route path="/admin/menu" element={<MenuManager />} />
      <Route path="/admin/feedback" element={<FeedbackViewer />} />
      <Route path="/admin/hours" element={<HoursEditor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
