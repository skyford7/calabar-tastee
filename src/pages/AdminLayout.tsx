import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import {
  LayoutDashboard, Users, Utensils, Clock, ScrollText, MessageSquare,
  LogOut, ChevronLeft, ChevronRight, Shield
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isSuperAdmin } = useLocalAuth();
  const location = useLocation();

  const navItems = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/staff", icon: Users, label: "Staff" },
    { to: "/admin/menu", icon: Utensils, label: "Menu" },
    { to: "/admin/hours", icon: Clock, label: "Opening Hours" },
    { to: "/admin/logs", icon: ScrollText, label: "Activity Logs" },
    { to: "/admin/feedback", icon: MessageSquare, label: "Feedback" },
  ];

  return (
    <div className="min-h-screen bg-[#1a1410] flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-[#0d0a08] border-r border-amber-900/30 flex flex-col transition-all duration-300 flex-shrink-0`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-amber-900/30">
          {!collapsed && <span className="text-lg font-bold text-gradient font-['Playfair_Display']">Admin</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-amber-100/60 hover:text-amber-400 p-1">
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-amber-600/20 text-amber-400 border-r-2 border-amber-500' : 'text-amber-100/60 hover:bg-amber-900/10 hover:text-amber-300'}`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-amber-900/30 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-amber-500" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.firstName || user?.username}</p>
                <p className="text-amber-100/40 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={logout} className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 text-sm py-2 px-3 rounded-lg hover:bg-red-600/10 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#14100c] border-b border-amber-900/30 flex items-center justify-between px-6">
          <h1 className="text-white font-semibold">
            {navItems.find(n => location.pathname.startsWith(n.to))?.label || "Dashboard"}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-amber-100/40 text-sm">{user?.username}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${isSuperAdmin ? 'bg-purple-600/20 text-purple-400' : 'bg-amber-600/20 text-amber-400'}`}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
