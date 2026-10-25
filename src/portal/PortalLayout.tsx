import { useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import {
  Activity,
  CalendarDays,
  ChefHat,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  Tags,
  UserCircle,
  Users,
  UtensilsCrossed,
  X,
  ExternalLink,
  Megaphone,
  Contact,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { SITE_ORIGIN, portalPath } from "@/lib/env";
import { ROLE_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: ReactNode; show: boolean };

export function PortalLayout() {
  const { profile, role, can, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const nav: NavItem[] = [
    {
      to: "/",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      show: true,
    },
    {
      to: "/center-net",
      label: "Center Net",
      icon: <Megaphone className="h-4 w-4" />,
      show: true,
    },
    {
      to: "/team",
      label: "Team",
      icon: <Contact className="h-4 w-4" />,
      show: true,
    },
    {
      to: "/roster",
      label: "Roster",
      icon: <CalendarDays className="h-4 w-4" />,
      show: can.viewRoster,
    },
    {
      to: "/menu",
      label: "Menu items",
      icon: <UtensilsCrossed className="h-4 w-4" />,
      show: can.manageMenu,
    },
    {
      to: "/categories",
      label: "Categories",
      icon: <Tags className="h-4 w-4" />,
      show: can.manageMenu,
    },
    {
      to: "/staff",
      label: "Staff",
      icon: <Users className="h-4 w-4" />,
      show: can.manageStaff,
    },
    {
      to: "/hours",
      label: "Opening hours",
      icon: <Clock className="h-4 w-4" />,
      show: can.manageHours,
    },
    {
      to: "/feedback",
      label: "Feedback",
      icon: <MessageSquare className="h-4 w-4" />,
      show: can.viewFeedback,
    },
    {
      to: "/activity",
      label: "Activity log",
      icon: <Activity className="h-4 w-4" />,
      show: can.viewActivity,
    },
    {
      to: "/account",
      label: "My account",
      icon: <UserCircle className="h-4 w-4" />,
      show: true,
    },
  ];

  const links = (
    <nav className="space-y-1">
      {nav
        .filter(n => n.show)
        .map(n => (
          <NavLink
            key={n.to}
            to={portalPath(n.to)}
            end={n.to === "/"}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-amber-600/20 text-amber-300"
                  : "text-amber-100/70 hover:bg-amber-900/20 hover:text-amber-200"
              )
            }
          >
            {n.icon}
            {n.label}
          </NavLink>
        ))}
    </nav>
  );

  const userBox = (
    <div className="border-t border-amber-900/30 pt-4">
      <div className="mb-3 px-1">
        <div className="truncate text-sm font-medium text-white">
          {profile?.full_name || profile?.username}
        </div>
        {profile?.username && (
          <div className="truncate text-xs text-amber-100/40">@{profile.username}</div>
        )}
        <div className="text-xs text-amber-500">
          {role ? ROLE_LABEL[role] : ""}
        </div>
      </div>
      <a
        href={SITE_ORIGIN}
        className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-amber-100/60 hover:text-amber-200"
      >
        <ExternalLink className="h-4 w-4" /> View website
      </a>
      <button
        onClick={() => void signOut()}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-900/20"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );

  const brand = (
    <div className="flex items-center gap-2">
      <ChefHat className="h-7 w-7 text-amber-500" />
      <div className="leading-tight">
        <div className="font-bold text-amber-400">Calabar Tastee</div>
        <div className="text-[11px] uppercase tracking-wider text-amber-100/40">
          Staff portal
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1a1410] text-amber-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col justify-between border-r border-amber-900/30 bg-[#1f1712] p-4 lg:flex">
        <div className="space-y-8">
          {brand}
          {links}
        </div>
        {userBox}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-amber-900/30 bg-[#1f1712]/95 px-4 backdrop-blur lg:hidden">
        {brand}
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-amber-100/80"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      </header>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-full w-72 flex-col justify-between bg-[#1f1712] p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                {brand}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="p-1 text-amber-100/60"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {links}
            </div>
            {userBox}
          </div>
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 lg:ml-60 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
