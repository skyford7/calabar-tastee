import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { trpc } from "@/providers/trpc";
import { Clock, Save } from "lucide-react";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function HoursEditor() {
  const hoursQuery = trpc.hours.list.useQuery();
  const updateMutation = trpc.hours.update.useMutation({
    onSuccess: () => hoursQuery.refetch(),
  });

  const [edits, setEdits] = useState<Record<string, { open_time: string | null; close_time: string | null; is_closed: boolean }>>({});

  const hours = hoursQuery.data || [];

  const handleSave = (day: string) => {
    const edit = edits[day];
    if (!edit) return;
    updateMutation.mutate({
      day,
      open_time: edit.is_closed ? null : edit.open_time,
      close_time: edit.is_closed ? null : edit.close_time,
      is_closed: edit.is_closed,
    });
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-white mb-6">Opening Hours</h1>
      <div className="bg-[#231a14] border border-amber-900/30 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {days.map((day) => {
            const hour = hours.find((h) => h.day === day);
            if (!hour) return null;

            const edit = edits[day] || {
              open_time: hour.open_time,
              close_time: hour.close_time,
              is_closed: hour.is_closed,
            };

            return (
              <div key={day} className="bg-[#1a1410] border border-amber-900/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-white font-semibold capitalize">{hour.day_label}</span>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-amber-100/70">
                    <input
                      type="checkbox"
                      checked={edit.is_closed}
                      onChange={(e) => setEdits({ ...edits, [day]: { ...edit, is_closed: e.target.checked } })}
                      className="rounded accent-amber-500"
                    />
                    Closed all day
                  </label>
                  {!edit.is_closed && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-amber-100/50 block mb-1">Open</label>
                        <input
                          type="time"
                          value={edit.open_time || "12:00"}
                          onChange={(e) => setEdits({ ...edits, [day]: { ...edit, open_time: e.target.value } })}
                          className="w-full bg-[#231a14] border border-amber-900/30 rounded px-2 py-1.5 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-amber-100/50 block mb-1">Close</label>
                        <input
                          type="time"
                          value={edit.close_time || "19:00"}
                          onChange={(e) => setEdits({ ...edits, [day]: { ...edit, close_time: e.target.value } })}
                          className="w-full bg-[#231a14] border border-amber-900/30 rounded px-2 py-1.5 text-white text-sm"
                        />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleSave(day)}
                    className="flex items-center gap-2 w-full justify-center px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
