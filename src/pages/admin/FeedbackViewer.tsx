import { AdminLayout } from "./AdminLayout";
import { trpc } from "@/providers/trpc";
import { Trash2, CheckCircle } from "lucide-react";

export function FeedbackViewer() {
  const feedbackQuery = trpc.feedback.list.useQuery();
  const markReadMutation = trpc.feedback.markRead.useMutation({
    onSuccess: () => feedbackQuery.refetch(),
  });
  const deleteMutation = trpc.feedback.delete.useMutation({
    onSuccess: () => feedbackQuery.refetch(),
  });

  const items = feedbackQuery.data || [];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-white mb-6">Feedback Submissions</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-amber-100/50 border-b border-amber-900/30 text-left">
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Phone</th>
              <th className="pb-3 pr-4">Comment</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-amber-900/20 text-amber-100/70">
                <td className="py-3 pr-4 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="py-3 pr-4">{item.name}</td>
                <td className="py-3 pr-4">{item.email}</td>
                <td className="py-3 pr-4">{item.phone || "-"}</td>
                <td className="py-3 pr-4 max-w-xs truncate">{item.comment}</td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === "new" ? "bg-blue-600/20 text-blue-400" : "bg-green-600/20 text-green-400"
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    {item.status === "new" && (
                      <button onClick={() => markReadMutation.mutate({ id: item.id })} className="text-green-400 hover:text-green-300" title="Mark as read">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteMutation.mutate({ id: item.id })} className="text-red-400 hover:text-red-300" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <div className="text-center py-12 text-amber-100/40">No feedback submissions yet.</div>
      )}
    </AdminLayout>
  );
}
