import { AdminLayout } from "./AdminLayout";
import { trpc } from "@/providers/trpc";
import { Users, MessageSquare, Utensils, TrendingUp } from "lucide-react";

export function Dashboard() {
  const statsQuery = trpc.admin.stats.useQuery();
  const feedbackQuery = trpc.feedback.list.useQuery();

  const stats = statsQuery.data || { totalMenuItems: 0, totalFeedback: 0, newFeedback: 0 };
  const recentFeedback = (feedbackQuery.data || []).slice(0, 5);

  const cards = [
    { label: "Total Menu Items", value: stats.totalMenuItems, icon: Utensils, color: "text-amber-400" },
    { label: "Total Feedback", value: stats.totalFeedback, icon: MessageSquare, color: "text-blue-400" },
    { label: "New Submissions", value: stats.newFeedback, icon: TrendingUp, color: "text-green-400" },
    { label: "Staff Members", value: 1, icon: Users, color: "text-purple-400" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-[#231a14] border border-amber-900/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-100/60 text-sm">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-3xl font-bold text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Feedback</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-amber-100/50 border-b border-amber-900/30">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Comment</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentFeedback.map((f) => (
                <tr key={f.id} className="border-b border-amber-900/20 text-amber-100/70">
                  <td className="py-3 pr-4">{f.name}</td>
                  <td className="py-3 pr-4">{f.email}</td>
                  <td className="py-3 pr-4 max-w-xs truncate">{f.comment}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      f.status === "new" ? "bg-blue-600/20 text-blue-400" : "bg-green-600/20 text-green-400"
                    }`}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
