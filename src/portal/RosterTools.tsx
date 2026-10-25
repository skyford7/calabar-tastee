import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { errorMessage, supabase } from "@/lib/supabase";
import { qk } from "@/lib/queries";
import { addDays, formatDay, londonToday, startOfWeek } from "@/lib/format";
import type { DirectoryEntry, Shift, TimeOff } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, Checkbox, Field, Input, Modal, Select, useConfirm } from "./ui";

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const isoDow = (d: string) => ((new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7) + 1; // Mon=1
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Time-off covering a date for a person (or the whole team). */
export const offFor = (list: TimeOff[], staffId: string, date: string) =>
  list.find(t => (t.staff_id === null || t.staff_id === staffId) && t.start_date <= date && date <= t.end_date);

type Pattern = "weekdays" | "weekends" | "days" | "alt_weeks" | "alt_days";

const PATTERNS: { value: Pattern; label: string }[] = [
  { value: "weekdays", label: "Every weekday (Mon–Fri)" },
  { value: "weekends", label: "Weekends only (Sat & Sun)" },
  { value: "days", label: "Specific days, every week" },
  { value: "alt_weeks", label: "Specific days, every other week" },
  { value: "alt_days", label: "Every other day" },
];

export function RepeatShiftsModal({
  open,
  onClose,
  people,
  timeOff,
  initialStaff,
}: {
  open: boolean;
  onClose: () => void;
  people: DirectoryEntry[];
  timeOff: TimeOff[];
  initialStaff?: string;
}) {
  const qc = useQueryClient();
  const [staff, setStaff] = useState(initialStaff ?? "");
  const [pattern, setPattern] = useState<Pattern>("weekdays");
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [start, setStart] = useState(() => startOfWeek(londonToday()));
  const [weeks, setWeeks] = useState(8);
  const [from, setFrom] = useState("12:00");
  const [to, setTo] = useState("19:00");
  const [position, setPosition] = useState("");
  const [notes, setNotes] = useState("");
  const [publish, setPublish] = useState(false);

  const who = staff || people[0]?.id || "";

  const run = useMutation({
    mutationFn: async () => {
      if (!who) throw new Error("Choose a team member.");
      if (to <= from) throw new Error("End time must be after start time.");
      if ((pattern === "days" || pattern === "alt_weeks") && !days.length) throw new Error("Pick at least one day.");
      const last = addDays(start, weeks * 7 - 1);
      const wanted: string[] = [];
      for (let d = start; d <= last; d = addDays(d, 1)) {
        const dow = isoDow(d);
        const weekIdx = Math.floor(dayDiff(startOfWeek(start), d) / 7);
        const ok =
          pattern === "weekdays" ? dow <= 5
          : pattern === "weekends" ? dow >= 6
          : pattern === "days" ? days.includes(dow)
          : pattern === "alt_weeks" ? days.includes(dow) && weekIdx % 2 === 0
          : dayDiff(start, d) % 2 === 0;
        if (ok) wanted.push(d);
      }
      const { data: existing, error: exErr } = await supabase
        .from("shifts")
        .select("shift_date,start_time,end_time")
        .eq("staff_id", who)
        .gte("shift_date", start)
        .lte("shift_date", last);
      if (exErr) throw exErr;
      const busy = new Set(
        (existing ?? [])
          .filter(s => s.start_time.slice(0, 5) < to && from < s.end_time.slice(0, 5))
          .map(s => s.shift_date as string)
      );
      let holiday = 0;
      let clash = 0;
      const rows = wanted.flatMap(d => {
        if (offFor(timeOff, who, d)) { holiday++; return []; }
        if (busy.has(d)) { clash++; return []; }
        return [{
          staff_id: who,
          shift_date: d,
          start_time: from,
          end_time: to,
          position: position.trim() || null,
          notes: notes.trim() || null,
          status: publish ? "published" : "draft",
        }];
      });
      if (!rows.length) throw new Error("Nothing to add: every matching day is a holiday or already has a shift.");
      const { error } = await supabase.from("shifts").insert(rows);
      if (error) throw error;
      return { added: rows.length, holiday, clash };
    },
    onSuccess: r => {
      const extra = [r.holiday && `${r.holiday} skipped for holiday`, r.clash && `${r.clash} skipped (already have a shift)`]
        .filter(Boolean)
        .join(", ");
      toast.success(`Added ${r.added} shift${r.added === 1 ? "" : "s"}${extra ? ` — ${extra}` : ""}`);
      void qc.invalidateQueries({ queryKey: ["shifts"] });
      onClose();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const showDays = pattern === "days" || pattern === "alt_weeks";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Repeat shifts"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => run.mutate()} loading={run.isPending}>Add shifts</Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Team member" className="sm:col-span-2">
          <Select value={who} onChange={e => setStaff(e.target.value)}>
            {people.map(p => (
              <option key={p.id} value={p.id}>
                {p.full_name || "Unnamed"} {p.job_title ? `— ${p.job_title}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pattern" className="sm:col-span-2">
          <Select value={pattern} onChange={e => setPattern(e.target.value as Pattern)}>
            {PATTERNS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </Field>
        {showDays && (
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {DAY_LABELS.map((l, i) => {
              const on = days.includes(i + 1);
              return (
                <button
                  type="button"
                  key={l}
                  onClick={() => setDays(on ? days.filter(x => x !== i + 1) : [...days, i + 1])}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm",
                    on ? "border-amber-500 bg-amber-500/20 text-amber-200" : "border-amber-900/40 text-amber-100/60"
                  )}
                >
                  {l}
                </button>
              );
            })}
          </div>
        )}
        <Field label="Starting from">
          <Input type="date" value={start} onChange={e => setStart(e.target.value)} />
        </Field>
        <Field label="For how many weeks">
          <Select value={weeks} onChange={e => setWeeks(Number(e.target.value))}>
            {[1, 2, 4, 8, 12, 26].map(w => (
              <option key={w} value={w}>{w} week{w === 1 ? "" : "s"}</option>
            ))}
          </Select>
        </Field>
        <Field label="Start">
          <Input type="time" step={900} value={from} onChange={e => setFrom(e.target.value)} />
        </Field>
        <Field label="End">
          <Input type="time" step={900} value={to} onChange={e => setTo(e.target.value)} />
        </Field>
        <Field label="Position / role" className="sm:col-span-2">
          <Input maxLength={60} value={position} onChange={e => setPosition(e.target.value)} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Input maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Checkbox label="Publish straight away (visible to staff)" checked={publish} onChange={setPublish} />
          <p className="mt-1 text-xs text-amber-100/40">
            Holidays and days that already have a shift are skipped automatically.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export function HolidaysModal({
  open,
  onClose,
  people,
  timeOff,
}: {
  open: boolean;
  onClose: () => void;
  people: DirectoryEntry[];
  timeOff: TimeOff[];
}) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const today = londonToday();
  const [staff, setStaff] = useState("all");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState("Holiday");
  const names = new Map(people.map(p => [p.id, p.full_name || "Unnamed"]));

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: qk.timeOff });
    void qc.invalidateQueries({ queryKey: ["shifts"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      if (to < from) throw new Error("The end date can't be before the start date.");
      const { error } = await supabase.from("time_off").insert({
        staff_id: staff === "all" ? null : staff,
        start_date: from,
        end_date: to,
        reason: reason.trim() || "Holiday",
      });
      if (error) throw error;
      // Shifts that fall on the holiday are removed.
      let q = supabase.from("shifts").delete({ count: "exact" }).gte("shift_date", from).lte("shift_date", to);
      if (staff !== "all") q = q.eq("staff_id", staff);
      const { count, error: delErr } = await q;
      if (delErr) throw delErr;
      return count ?? 0;
    },
    onSuccess: n => {
      toast.success(n ? `Holiday added — ${n} shift${n === 1 ? "" : "s"} removed` : "Holiday added");
      refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("time_off").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: e => toast.error(errorMessage(e)),
  });

  const upcoming = timeOff.filter(t => t.end_date >= today);
  const fmt = (d: string) => formatDay(d, { day: "numeric", month: "short", year: "numeric" });

  return (
    <Modal open={open} onClose={onClose} title="Holidays & time off">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Who" className="sm:col-span-2">
          <Select value={staff} onChange={e => setStaff(e.target.value)}>
            <option value="all">Everyone (e.g. bank holiday)</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || "Unnamed"}</option>
            ))}
          </Select>
        </Field>
        <Field label="From">
          <Input type="date" value={from} onChange={e => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} />
        </Field>
        <Field label="To (last day off)">
          <Input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} />
        </Field>
        <Field label="Reason" className="sm:col-span-2">
          <Input maxLength={100} value={reason} onChange={e => setReason(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Button
            loading={add.isPending}
            onClick={async () => {
              if (await confirm({
                title: "Add holiday?",
                message: "Any shifts already booked on these dates will be removed.",
                confirmLabel: "Add holiday",
              })) add.mutate();
            }}
          >
            Add holiday
          </Button>
        </div>
      </div>

      <h4 className="mb-2 mt-6 text-sm font-semibold text-white">Upcoming holidays</h4>
      {upcoming.length === 0 ? (
        <p className="text-sm text-amber-100/50">None booked.</p>
      ) : (
        <ul className="divide-y divide-amber-900/30 rounded-lg border border-amber-900/30">
          {upcoming.map(t => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div>
                <div className="text-white">{t.staff_id ? names.get(t.staff_id) ?? "Unknown" : "Everyone"} · {t.reason}</div>
                <div className="text-xs text-amber-100/50">
                  {t.start_date === t.end_date ? fmt(t.start_date) : `${fmt(t.start_date)} – ${fmt(t.end_date)}`}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => del.mutate(t.id)} aria-label="Remove holiday">
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function useTimeOff() {
  return useQuery({
    queryKey: qk.timeOff,
    queryFn: async () => {
      const { data, error } = await supabase.from("time_off").select("*").order("start_date");
      if (error) return [] as TimeOff[]; // table not created yet
      return data as TimeOff[];
    },
  });
}

export type { Shift };
