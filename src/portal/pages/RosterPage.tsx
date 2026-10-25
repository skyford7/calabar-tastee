import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Repeat,
  Palmtree,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage, supabase } from "@/lib/supabase";
import { qk, useTeamDirectory } from "@/lib/queries";
import {
  addDays,
  formatDay,
  hhmm,
  londonToday,
  shiftHours,
  startOfWeek,
  weekDays,
} from "@/lib/format";
import type { Shift } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HolidaysModal, RepeatShiftsModal, offFor, useTimeOff } from "../RosterTools";
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  Textarea,
  useConfirm,
} from "../ui";

type Draft = {
  id?: number;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  position: string;
  notes: string;
  publish: boolean;
};

export function RosterPage() {
  const { profile, can } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const today = londonToday();
  const [monday, setMonday] = useState(() => startOfWeek(today));
  const [onlyMine, setOnlyMine] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const days = weekDays(monday);
  const sunday = days[6];
  const directoryAll = useTeamDirectory();
  // Database Administrators are never rostered.
  const directory = useMemo(
    () => ({ ...directoryAll, data: (directoryAll.data ?? []).filter(p => p.role !== "dba") }),
    [directoryAll]
  );
  const timeOff = useTimeOff();
  const [dayPick, setDayPick] = useState<string | null>(null);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);

  const shifts = useQuery({
    queryKey: qk.shifts(monday, sunday),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .gte("shift_date", monday)
        .lte("shift_date", sunday)
        .order("start_time");
      if (error) throw error;
      return data as Shift[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["shifts"] });

  const people = useMemo(() => {
    const list = directory.data ?? [];
    const withShifts = new Set((shifts.data ?? []).map(s => s.staff_id));
    // Managers see everyone (to assign shifts); staff see people working this week.
    const visible = can.manageShifts
      ? list
      : list.filter(p => withShifts.has(p.id));
    const filtered = onlyMine
      ? visible.filter(p => p.id === profile?.id)
      : visible;
    // Put "me" first.
    return [...filtered].sort((a, b) =>
      a.id === profile?.id
        ? -1
        : b.id === profile?.id
          ? 1
          : a.full_name.localeCompare(b.full_name)
    );
  }, [directory.data, shifts.data, can.manageShifts, onlyMine, profile?.id]);

  const byCell = useMemo(() => {
    const m = new Map<string, Shift[]>();
    (shifts.data ?? []).forEach(s => {
      const k = `${s.staff_id}|${s.shift_date}`;
      m.set(k, [...(m.get(k) ?? []), s]);
    });
    return m;
  }, [shifts.data]);

  const drafts = (shifts.data ?? []).filter(s => s.status === "draft");

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const row = {
        staff_id: d.staff_id,
        shift_date: d.shift_date,
        start_time: d.start_time,
        end_time: d.end_time,
        position: d.position.trim() || null,
        notes: d.notes.trim() || null,
        status: d.publish ? "published" : "draft",
      };
      if (row.end_time <= row.start_time)
        throw new Error(
          "End time must be after start time (shifts can't cross midnight)."
        );
      const { error } = d.id
        ? await supabase.from("shifts").update(row).eq("id", d.id)
        : await supabase.from("shifts").insert(row);
      if (error) throw error;
    },
    onSuccess: (_r, d) => {
      toast.success(
        d.id
          ? "Shift updated"
          : d.publish
            ? "Shift published"
            : "Draft shift added"
      );
      setDraft(null);
      void refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shift deleted");
      setDraft(null);
      void refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const publishWeek = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("shifts")
        .update({ status: "published" })
        .eq("status", "draft")
        .gte("shift_date", monday)
        .lte("shift_date", sunday);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Roster published — staff can now see this week's shifts");
      void refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const copyLastWeek = useMutation({
    mutationFn: async () => {
      const prevMon = addDays(monday, -7);
      const { data, error } = await supabase
        .from("shifts")
        .select("staff_id, shift_date, start_time, end_time, position, notes")
        .gte("shift_date", prevMon)
        .lte("shift_date", addDays(prevMon, 6));
      if (error) throw error;
      if (!data.length) throw new Error("Last week has no shifts to copy.");
      const activeIds = new Set((directory.data ?? []).map(p => p.id));
      const rows = data
        .filter(s => activeIds.has(s.staff_id))
        .map(s => ({
          ...s,
          shift_date: addDays(s.shift_date, 7),
          status: "draft" as const,
        }));
      const { error: insErr } = await supabase.from("shifts").insert(rows);
      if (insErr) throw insErr;
      return rows.length;
    },
    onSuccess: n => {
      toast.success(`Copied ${n} shift${n === 1 ? "" : "s"} as drafts`);
      void refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const onPublish = async () => {
    if (
      await confirm({
        title: "Publish this week?",
        message: `${drafts.length} draft shift${drafts.length === 1 ? "" : "s"} for ${formatDay(monday)} – ${formatDay(sunday)} will become visible to staff.`,
        confirmLabel: "Publish",
      })
    ) {
      publishWeek.mutate();
    }
  };

  const onCopy = async () => {
    if (
      await confirm({
        title: "Copy last week's roster?",
        message:
          "All shifts from last week will be added to this week as drafts. Clashes with existing shifts will stop the copy.",
        confirmLabel: "Copy",
      })
    ) {
      copyLastWeek.mutate();
    }
  };

  const openNew = (staff_id: string, shift_date: string) =>
    setDraft({
      staff_id,
      shift_date,
      start_time: "12:00",
      end_time: "19:00",
      position: "",
      notes: "",
      publish: false,
    });

  const openEdit = (s: Shift) =>
    setDraft({
      id: s.id,
      staff_id: s.staff_id,
      shift_date: s.shift_date,
      start_time: hhmm(s.start_time),
      end_time: hhmm(s.end_time),
      position: s.position ?? "",
      notes: s.notes ?? "",
      publish: s.status === "published",
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft) save.mutate(draft);
  };

  const hoursFor = (id: string) =>
    (shifts.data ?? [])
      .filter(s => s.staff_id === id)
      .reduce((h, s) => h + shiftHours(s.start_time, s.end_time), 0);

  const renderCell = (p: { id: string; full_name: string }, d: string) => {
    const cell = byCell.get(`${p.id}|${d}`) ?? [];
    const off = offFor(timeOff.data ?? [], p.id, d);
    return (
                        <div className="space-y-1">
      {off && (
        <div className="truncate rounded-md bg-sky-500/15 px-2 py-1.5 text-xs text-sky-200" title={off.reason}>
          {off.reason || "Holiday"}
        </div>
      )}
      {cell.map(s => (
        <button
          key={s.id}
          disabled={!can.manageShifts}
          onClick={() => openEdit(s)}
          className={cn(
            "block w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors",
            s.status === "draft"
              ? "border border-dashed border-amber-500/50 text-amber-200/80"
              : "bg-amber-600/25 text-amber-100",
            can.manageShifts && "hover:bg-amber-600/40"
          )}
        >
          <div className="font-semibold">
            {hhmm(s.start_time)}–{hhmm(s.end_time)}
          </div>
          {s.position && (
            <div className="truncate opacity-80">
              {s.position}
            </div>
          )}
          {s.notes && (
            <div className="truncate opacity-60">
              {s.notes}
            </div>
          )}
          {s.status === "draft" && (
            <div className="text-[10px] uppercase tracking-wide opacity-70">
              Draft
            </div>
          )}
        </button>
      ))}
      {can.manageShifts && (
        <button
          onClick={() => openNew(p.id, d)}
          className="flex h-9 w-full items-center justify-center rounded-md text-amber-100/20 md:h-7 hover:bg-amber-900/30 hover:text-amber-300"
          aria-label={`Add shift for ${p.full_name} on ${d}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Roster"
        description={
          can.manageShifts
            ? "Click an empty cell to add a shift. Drafts are only visible to admins until published."
            : "Published shifts for the whole team. Times are UK time."
        }
        actions={
          can.manageShifts && (
            <>
              <Button variant="secondary" onClick={() => setRepeatOpen(true)}>
                <Repeat className="h-4 w-4" /> Repeat shifts
              </Button>
              <Button variant="secondary" onClick={() => setHolidaysOpen(true)}>
                <Palmtree className="h-4 w-4" /> Holidays
              </Button>
              <Button
                variant="secondary"
                onClick={() => void onCopy()}
                loading={copyLastWeek.isPending}
              >
                <Copy className="h-4 w-4" /> Copy last week
              </Button>
              <Button
                onClick={() => void onPublish()}
                disabled={!drafts.length}
                loading={publishWeek.isPending}
              >
                <Send className="h-4 w-4" /> Publish
                {drafts.length ? ` ${drafts.length}` : ""}
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMonday(addDays(monday, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-44 text-center font-medium text-white">
            {formatDay(monday, { day: "numeric", month: "short" })} –{" "}
            {formatDay(sunday, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMonday(addDays(monday, 7))}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {monday !== startOfWeek(today) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMonday(startOfWeek(today))}
            >
              This week
            </Button>
          )}
        </div>
        <Checkbox
          label="Only my shifts"
          checked={onlyMine}
          onChange={setOnlyMine}
        />
      </div>

      {shifts.error || directory.error ? (
        <ErrorBlock error={shifts.error || directory.error} />
      ) : shifts.isLoading || directory.isLoading ? (
        <LoadingBlock />
      ) : !people.length ? (
        <EmptyState title="No shifts this week." />
      ) : (
        <>
        <div className="hidden overflow-x-auto rounded-xl border border-amber-900/30 md:block">
          <table className="w-full min-w-[860px] table-fixed text-sm">
            <thead className="bg-[#231a14]">
              <tr>
                <th className="w-44 px-3 py-3 text-left text-xs uppercase tracking-wide text-amber-100/50">
                  Team
                </th>
                {days.map(d => (
                  <th
                    key={d}
                    className={cn(
                      "px-2 py-3 text-left text-xs font-medium",
                      d === today ? "text-amber-400" : "text-amber-100/60"
                    )}
                  >
                    {formatDay(d, { weekday: "short" })}
                    <span className="ml-1 font-normal text-amber-100/40">
                      {formatDay(d, { day: "numeric" })}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/20">
              {people.map(p => (
                <tr
                  key={p.id}
                  className={
                    p.id === profile?.id ? "bg-amber-500/[0.04]" : undefined
                  }
                >
                  <td className="px-3 py-2 align-top">
                    <div className="truncate font-medium text-white">
                      {p.full_name || "Unnamed"}
                      {p.id === profile?.id && (
                        <span className="ml-1 text-xs text-amber-500">
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-amber-100/40">
                      {p.job_title || "—"} · {hoursFor(p.id).toFixed(1)}h
                    </div>
                  </td>
                  {days.map(d => {
                    return (
                      <td
                        key={d}
                        className={cn(
                          "px-1.5 py-1.5 align-top",
                          d === today && "bg-amber-500/[0.03]"
                        )}
                      >
                        {renderCell(p, d)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phones: one day at a time */}
        <div className="md:hidden">
          <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1">
            {days.map(d => {
              const sel = d === (dayPick && days.includes(dayPick) ? dayPick : days.includes(today) ? today : days[0]);
              return (
                <button
                  key={d}
                  onClick={() => setDayPick(d)}
                  className={cn(
                    "flex min-w-[3.25rem] flex-1 flex-col items-center rounded-lg border px-2 py-2 text-xs",
                    sel
                      ? "border-amber-500 bg-amber-500/20 text-amber-200"
                      : "border-amber-900/40 text-amber-100/60",
                    d === today && !sel && "text-amber-400"
                  )}
                >
                  <span>{formatDay(d, { weekday: "short" })}</span>
                  <span className="text-base font-semibold">{formatDay(d, { day: "numeric" })}</span>
                </button>
              );
            })}
          </div>
          {(() => {
            const d = dayPick && days.includes(dayPick) ? dayPick : days.includes(today) ? today : days[0];
            return (
              <ul className="space-y-3">
                {people.map(p => (
                  <li key={p.id} className="rounded-xl border border-amber-900/30 bg-[#1a1410] p-3">
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">
                          {p.full_name || "Unnamed"}
                          {p.id === profile?.id && <span className="ml-1 text-xs text-amber-500">(you)</span>}
                        </div>
                        <div className="truncate text-xs text-amber-100/40">{p.job_title || "—"}</div>
                      </div>
                      <div className="flex-shrink-0 text-xs text-amber-100/40">{hoursFor(p.id).toFixed(1)}h this week</div>
                    </div>
                    {renderCell(p, d)}
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
        </>
      )}

      <RepeatShiftsModal
        key={repeatOpen ? "open" : "closed"}
        open={repeatOpen}
        onClose={() => setRepeatOpen(false)}
        people={directory.data ?? []}
        timeOff={timeOff.data ?? []}
      />
      <HolidaysModal
        open={holidaysOpen}
        onClose={() => setHolidaysOpen(false)}
        people={directory.data ?? []}
        timeOff={timeOff.data ?? []}
      />

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit shift" : "New shift"}
        footer={
          <div className="flex w-full items-center justify-between">
            <div>
              {draft?.id && (
                <Button
                  variant="ghost"
                  className="text-red-400"
                  onClick={() => draft.id && remove.mutate(draft.id)}
                  loading={remove.isPending}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button type="submit" form="shift-form" loading={save.isPending}>
                Save
              </Button>
            </div>
          </div>
        }
      >
        {draft && (
          <form
            id="shift-form"
            onSubmit={submit}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Team member" className="sm:col-span-2">
              <Select
                value={draft.staff_id}
                onChange={e => setDraft({ ...draft, staff_id: e.target.value })}
              >
                {(directory.data ?? []).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || "Unnamed"}{" "}
                    {p.job_title ? `— ${p.job_title}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date" className="sm:col-span-2">
              <Input
                type="date"
                required
                value={draft.shift_date}
                onChange={e =>
                  setDraft({ ...draft, shift_date: e.target.value })
                }
              />
            </Field>
            <Field label="Start">
              <Input
                type="time"
                required
                step={900}
                value={draft.start_time}
                onChange={e =>
                  setDraft({ ...draft, start_time: e.target.value })
                }
              />
            </Field>
            <Field label="End">
              <Input
                type="time"
                required
                step={900}
                value={draft.end_time}
                onChange={e => setDraft({ ...draft, end_time: e.target.value })}
              />
            </Field>
            <Field
              label="Position / role"
              hint="e.g. Kitchen, Front of house"
              className="sm:col-span-2"
            >
              <Input
                maxLength={60}
                value={draft.position}
                onChange={e => setDraft({ ...draft, position: e.target.value })}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                rows={2}
                maxLength={500}
                value={draft.notes}
                onChange={e => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Checkbox
                label="Published (visible to staff)"
                checked={draft.publish}
                onChange={v => setDraft({ ...draft, publish: v })}
              />
              {draft.id && draft.publish && (
                <p className="mt-1 text-xs text-amber-100/40">
                  Changes to a published shift are visible immediately.
                </p>
              )}
            </div>
            {draft.end_time <= draft.start_time && (
              <div className="sm:col-span-2">
                <Badge tone="red">End time must be after start time</Badge>
              </div>
            )}
          </form>
        )}
      </Modal>
    </>
  );
}
