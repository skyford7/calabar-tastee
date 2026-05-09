import { trpc } from "@/providers/trpc";
import { Users, Utensils, Clock, MessageSquare, Shield } from "lucide-react";
import { Link } from "react-router";

export default function DashboardHome() {
  const { data: menuItems } = trpc.menu.list.useQuery();
  const { data: staffList } = trpc.staff.list.useQuery();
  const { data: allHours } = trpc.hours.list.useQuery();
  const { data: logs } = trpc.logs.list.useQuery();

  const stats = [
    { label: "Menu Items", value: menuItems?.length || 0, icon: Utensils, color: "text-amber-500", bg: "bg-amber-600/10", link: "/admin/menu" },
    { label: "Staff Members", value: staffList?.filter(s => s.role !== "super_admin").length || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-600/10", link: "/admin/staff" },
    { label: "Opening Days", value: `${allHours?.filter(h => !h.isClosed).length || 0}/7`, icon: Clock, color: "text-green-500", bg: "bg-green-600/10", link: "/admin/hours" },
    { label: "Recent Actions", value: logs?.length || 0, icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-600/10", link: "/admin/logs" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Link key={s.label} to={s.link} className="bg-[#231a14] border border-amber-900/30 rounded-xl p-6 hover:border-amber-500/30 transition-colors group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <span className="text-3xl font-bold text-white">{s.value}</span>
            </div>
            <p className="text-amber-100/60 text-sm">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        {logs && logs.length > 0 ? (
          <div className="space-y-3">
            {logs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <Shield className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-100/80">
                    <span className="font-medium text-white">{log.username}</span> {log.action.replace(/_/g, ' ')}
                    {log.targetName && <span className="text-amber-100/60"> — {log.targetName}</span>}
                  </p>
                  <p className="text-amber-100/40 text-xs">{log.createdAt ? new Date(log.createdAt).toLocaleString('en-GB') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-amber-100/40 text-sm">No recent activity</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Current Opening Hours</h2>
          <div className="space-y-2">
            {allHours?.map(h => (
              <div key={h.day} className="flex justify-between text-sm">
                <span className="capitalize text-amber-100/60">{h.dayLabel}</span>
                <span className={h.isClosed ? 'text-red-400' : 'text-amber-100/80'}>
                  {h.isClosed ? 'Closed' : `${h.openTime} - ${h.closeTime}`}
                </span>
              </div>
            ))}
          </div>
          <Link to="/admin/hours" className="mt-4 inline-block text-amber-500 hover:text-amber-400 text-sm">Edit Hours →</Link>
        </div>
        <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/admin/menu" className="block bg-[#1a1410] border border-amber-900/30 rounded-lg p-3 text-sm text-amber-100/80 hover:border-amber-500/30 transition-colors">+ Add New Menu Item</Link>
            <Link to="/admin/staff" className="block bg-[#1a1410] border border-amber-900/30 rounded-lg p-3 text-sm text-amber-100/80 hover:border-amber-500/30 transition-colors">+ Add Staff Member</Link>
            <Link to="/admin/feedback" className="block bg-[#1a1410] border border-amber-900/30 rounded-lg p-3 text-sm text-amber-100/80 hover:border-amber-500/30 transition-colors">📨 View Customer Feedback</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
