import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, Search } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useTeamDirectory } from "@/lib/queries";
import { addDays, formatDay, hhmm, londonToday } from "@/lib/format";
import type { Shift } from "@/lib/types";
import { EmptyState, ErrorBlock, Input, LoadingBlock, PageHeader } from "../ui";

/** Look up any colleague: name, job title, phone number and upcoming shifts. */
export function TeamPage() {
  const { profile } = useAuth();
  const directory = useTeamDirectory();
  const today = londonToday();
  const until = addDays(today, 27);
  const [q, setQ] = useState("");

  const shifts = useQuery({
    queryKey: ["shifts", "lookup", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("status", "published")
        .gte("shift_date", today)
        .lte("shift_date", until)
        .order("shift_date")
        .order("start_time");
      if (error) throw error;
      return data as Shift[];
    },
  });

  const byStaff = useMemo(() => {
    const m = new Map<string, Shift[]>();
    (shifts.data ?? []).forEach(s => m.set(s.staff_id, [...(m.get(s.staff_id) ?? []), s]));
    return m;
  }, [shifts.data]);

  const needle = q.trim().toLowerCase();
  const people = (directory.data ?? []).filter(p =>
    !needle ||
    [p.full_name, p.job_title ?? "", p.phone ?? ""].some(v => v.toLowerCase().includes(needle))
  );

  return (
    <>
      <PageHeader title="Team" description="Find a colleague's contact details and upcoming shifts." />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-100/40" />
        <Input className="pl-9" placeholder="Search by name, job title or phone" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {directory.error ? (
        <ErrorBlock error={directory.error} />
      ) : directory.isLoading ? (
        <LoadingBlock />
      ) : !people.length ? (
        <EmptyState title="No one found." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {people.map(p => {
            const list = byStaff.get(p.id) ?? [];
            return (
              <li key={p.id} className="rounded-2xl border border-amber-900/30 bg-[#1a1410] p-4">
                <div className="font-semibold text-white">
                  {p.full_name || "Unnamed"}
                  {p.id === profile?.id && <span className="ml-1 text-xs text-amber-500">(you)</span>}
                </div>
                <div className="text-sm text-amber-100/60">{p.job_title || "No job title"}</div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-amber-400" />
                  {p.phone ? (
                    <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="text-amber-200 hover:underline">
                      {p.phone}
                    </a>
                  ) : (
                    <span className="text-amber-100/40">No number added</span>
                  )}
                </div>
                <div className="mt-3 border-t border-amber-900/30 pt-3">
                  <div className="mb-1 text-xs uppercase tracking-wide text-amber-100/40">Shifts, next 4 weeks</div>
                  {shifts.isLoading ? (
                    <div className="text-sm text-amber-100/40">Loading…</div>
                  ) : list.length === 0 ? (
                    <div className="text-sm text-amber-100/40">No published shifts</div>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {list.slice(0, 8).map(s => (
                        <li key={s.id} className="flex justify-between gap-2 text-amber-100/80">
                          <span>{formatDay(s.shift_date, { weekday: "short", day: "numeric", month: "short" })}</span>
                          <span className="text-amber-100/60">
                            {hhmm(s.start_time)}–{hhmm(s.end_time)}
                            {s.position ? ` · ${s.position}` : ""}
                          </span>
                        </li>
                      ))}
                      {list.length > 8 && <li className="text-xs text-amber-100/40">+ {list.length - 8} more</li>}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
