import { trpc } from "@/providers/trpc";
import { ScrollText, Shield, Utensils, Clock, Users, Settings } from "lucide-react";

const actionLabels: Record<string, string> = {
  created_user: "Created User",
  updated_user: "Updated User",
  reset_password: "Reset Password",
  suspended_user: "Suspended User",
  reactivated_user: "Reactivated User",
  deleted_user: "Deleted User",
  created_menu_item: "Added Menu Item",
  updated_menu_item: "Updated Menu Item",
  deleted_menu_item: "Removed Menu Item",
  updated_opening_hours: "Updated Opening Hours",
};

const iconMap: Record<string, any> = {
  user: Users,
  menu: Utensils,
  setting: Settings,
};

export default function LogsPage() {
  const { data: logs } = trpc.logs.list.useQuery();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Activity Logs</h2>

      <div className="bg-[#231a14] border border-amber-900/30 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-900/30 text-amber-100/40 text-left">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs && logs.length > 0 ? (
              logs.map(log => {
                const Icon = iconMap[log.targetType || ""] || ScrollText;
                return (
                  <tr key={log.id} className="border-b border-amber-900/20 hover:bg-amber-900/5">
                    <td className="px-4 py-3 text-amber-100/40 whitespace-nowrap">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-500" />
                        <span className="text-white">{log.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-600/10 text-amber-400">
                        {actionLabels[log.action] || log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-amber-100/40" />
                        <span className="text-amber-100/60">{log.targetName || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-amber-100/40 max-w-xs truncate">{log.details}</td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-amber-100/40">No activity logs yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
