import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Clock, Save } from "lucide-react";

export default function HoursPage() {
  const utils = trpc.useUtils();
  const { data: allHours, refetch } = trpc.hours.list.useQuery();
  const { data: status } = trpc.hours.status.useQuery();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const updateMutation = trpc.hours.update.useMutation({
    onSuccess: () => { setMessage("Hours updated!"); utils.hours.invalidate(); utils.hours.status.invalidate(); },
  });

  function handleSave(day: string, openTime: string | null, closeTime: string | null, isClosed: boolean) {
    setSaving(day);
    updateMutation.mutate({ day, openTime: isClosed ? null : openTime, closeTime: isClosed ? null : closeTime, isClosed }, {
      onSettled: () => setSaving(null),
    });
  }

  const statusColors: Record<string, string> = {
    open: "text-green-400",
    opening_soon: "text-amber-400",
    closing_soon: "text-amber-400",
    closed: "text-red-400",
  };

  return (
    <div className="space-y-6">
      {message && <div className="bg-green-600/20 border border-green-600/30 text-green-400 p-3 rounded-lg text-sm">{message} <button onClick={() => setMessage("")} className="ml-2">×</button></div>}

      <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" /> Current Status</h2>
        <p className={`text-lg font-semibold ${statusColors[status?.status || 'closed']}`}>
          {status?.label || "Checking..."}
        </p>
        <p className="text-amber-100/40 text-sm mt-1">
          {status?.todayHours?.openTime && status?.todayHours?.closeTime
            ? `Today's hours: ${status.todayHours.openTime} - ${status.todayHours.closeTime}`
            : "Closed today"}
        </p>
      </div>

      <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Edit Opening Hours</h2>
        <div className="space-y-4">
          {allHours?.map(h => (
            <HourRow key={h.day} hour={h} saving={saving === h.day} onSave={handleSave} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HourRow({ hour, saving, onSave }: { hour: any; saving: boolean; onSave: (d: string, o: string | null, c: string | null, cl: boolean) => void }) {
  const [openTime, setOpenTime] = useState(hour.openTime || "12:00");
  const [closeTime, setCloseTime] = useState(hour.closeTime || "19:00");
  const [isClosed, setIsClosed] = useState(hour.isClosed);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-[#1a1410] rounded-lg">
      <div className="w-28 flex-shrink-0">
        <span className="text-white font-medium">{hour.dayLabel}</span>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!isClosed} onChange={e => setIsClosed(!e.target.checked)} className="rounded" />
        <span className="text-sm text-amber-100/60">Open</span>
      </label>
      {!isClosed && (
        <>
          <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} className="bg-[#231a14] border border-amber-900/30 rounded px-3 py-1 text-white text-sm" />
          <span className="text-amber-100/40">to</span>
          <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} className="bg-[#231a14] border border-amber-900/30 rounded px-3 py-1 text-white text-sm" />
        </>
      )}
      <div className="flex-1" />
      <button
        onClick={() => onSave(hour.day, openTime, closeTime, isClosed)}
        disabled={saving}
        className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm flex items-center gap-1"
      >
        <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
