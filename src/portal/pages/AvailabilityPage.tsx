import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { WEEKDAYS, useAvailability } from "@/lib/availability";
import { addDays, formatDay, londonToday } from "@/lib/format";
import { qk, useTeamDirectory } from "@/lib/queries";
import { errorMessage, supabase } from "@/lib/supabase";
import type { Availability } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, Field, Input, LoadingBlock, PageHeader, Select, Table } from "../ui";

type State = "yes" | "no" | "unset";
const MAX_RANGE_DAYS = 62;

/** Staff say which days they can work; admins can see the whole team and edit on anyone's behalf. */
export function AvailabilityPage() {
  const { profile, can } = useAuth();
  const manager = can.manageShifts;
  const directory = useTeamDirectory();
  const all = useAvailability();
  const [picked, setPicked] = useState<string>("");
  const myId = profile?.id ?? "";
  const staffId = manager && picked ? picked : myId;

  const people = useMemo(
    () => (directory.data ?? []).filter(p => p.role !== "dba").sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [directory.data]
  );
  const rows = useMemo(() => (all.data ?? []).filter(a => a.staff_id === staffId), [all.data, staffId]);
  const editingOther = staffId !== myId;
  const who = people.find(p => p.id === staffId)?.full_name ?? "this person";

  return (
    <>
      <PageHeader
        title="Availability"
        description="Mark the days you can work and the days you can't. Your manager sees this when building the roster."
      />

      {manager && (
        <div className="mb-4 max-w-sm">
          <Field label="Editing availability for">
            <Select value={staffId} onChange={e => setPicked(e.target.value)}>
              <option value={myId}>Me</option>
              {people
                .filter(p => p.id !== myId)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
      )}

      {all.isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <WeeklyCard staffId={staffId} rows={rows} title={editingOther ? `${who}'s usual week` : "My usual week"} />
          <DatesCard staffId={staffId} rows={rows} title={editingOther ? `${who}: specific dates` : "Specific dates"} />
        </div>
      )}

      {manager && <Overview people={people} all={all.data ?? []} />}
    </>
  );
}

function useSave(staffId: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: qk.availability });
  return { staffId, refresh };
}

function WeeklyCard({ staffId, rows, title }: { staffId: string; rows: Availability[]; title: string }) {
  const { refresh } = useSave(staffId);
  const current = (d: number): State => {
    const r = rows.find(a => a.weekday === d);
    return r ? (r.available ? "yes" : "no") : "unset";
  };

  const set = useMutation({
    mutationFn: async ({ day, state }: { day: number; state: State }) => {
      if (state === "unset") {
        const { error } = await supabase.from("availability").delete().eq("staff_id", staffId).eq("weekday", day);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("availability")
        .upsert({ staff_id: staffId, weekday: day, available: state === "yes" }, { onConflict: "staff_id,weekday" });
      if (error) throw error;
    },
    onSuccess: () => void refresh(),
    onError: err => toast.error(errorMessage(err)),
  });

  const options: { state: State; label: string; on: string }[] = [
    { state: "yes", label: "Available", on: "bg-emerald-600/30 text-emerald-200 border-emerald-500/60" },
    { state: "no", label: "Not available", on: "bg-red-600/30 text-red-200 border-red-500/60" },
    { state: "unset", label: "Not set", on: "bg-amber-900/40 text-amber-100 border-amber-500/40" },
  ];

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-semibold text-white">{title}</h2>
      <p className="mb-4 text-sm text-amber-100/50">Repeats every week. Tap a choice for each day.</p>
      <ul className="space-y-3">
        {WEEKDAYS.map((name, day) => (
          <li key={name} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-amber-50">{name}</span>
            <div className="grid grid-cols-3 gap-1.5 sm:w-[22rem]">
              {options.map(o => (
                <button
                  key={o.state}
                  type="button"
                  disabled={set.isPending}
                  aria-pressed={current(day) === o.state}
                  onClick={() => current(day) !== o.state && set.mutate({ day, state: o.state })}
                  className={cn(
                    "h-10 rounded-lg border px-2 text-xs font-medium transition-colors",
                    current(day) === o.state
                      ? o.on
                      : "border-amber-900/40 bg-[#1a1410] text-amber-100/60 hover:border-amber-500/40"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DatesCard({ staffId, rows, title }: { staffId: string; rows: Availability[]; title: string }) {
  const { refresh } = useSave(staffId);
  const today = londonToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<"no" | "yes">("no");
  const [note, setNote] = useState("");

  const upcoming = rows
    .filter(a => a.on_date && a.on_date >= today)
    .sort((a, b) => (a.on_date! < b.on_date! ? -1 : 1));

  const add = useMutation({
    mutationFn: async () => {
      const end = to || from;
      if (!from) throw new Error("Choose a date.");
      if (end < from) throw new Error("The end date can't be before the start date.");
      const dates: string[] = [];
      for (let d = from; d <= end; d = addDays(d, 1)) {
        dates.push(d);
        if (dates.length > MAX_RANGE_DAYS) throw new Error(`Please choose ${MAX_RANGE_DAYS} days or fewer at a time.`);
      }
      const { error } = await supabase.from("availability").upsert(
        dates.map(d => ({ staff_id: staffId, on_date: d, available: kind === "yes", note: note.trim() || null })),
        { onConflict: "staff_id,on_date" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      setTo("");
      setNote("");
      void refresh();
    },
    onError: err => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("availability").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void refresh(),
    onError: err => toast.error(errorMessage(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    add.mutate();
  };

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-semibold text-white">{title}</h2>
      <p className="mb-4 text-sm text-amber-100/50">
        One-off days that override your usual week, like a day off or an extra day you can cover.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From">
            <Input type="date" required min={today} value={from} onChange={e => setFrom(e.target.value)} />
          </Field>
          <Field label="To (optional)">
            <Input type="date" min={from || today} value={to} onChange={e => setTo(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="I am">
            <Select value={kind} onChange={e => setKind(e.target.value as "no" | "yes")}>
              <option value="no">Not available</option>
              <option value="yes">Available</option>
            </Select>
          </Field>
          <Field label="Note (optional)">
            <Input maxLength={100} placeholder="e.g. Appointment" value={note} onChange={e => setNote(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" loading={add.isPending}>
          Add
        </Button>
      </form>

      <div className="mt-5 border-t border-amber-900/30 pt-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-100/60">Coming up</h3>
        {!upcoming.length ? (
          <p className="text-sm text-amber-100/40">No specific dates yet.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(a => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-900/30 bg-[#1a1410] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm text-amber-50">
                    {formatDay(a.on_date!, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  {a.note && <div className="truncate text-xs text-amber-100/50">{a.note}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={a.available ? "green" : "red"}>{a.available ? "Available" : "Not available"}</Badge>
                  <button
                    type="button"
                    aria-label="Remove"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(a.id)}
                    className="rounded-md p-2 text-amber-100/50 hover:bg-red-900/30 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/** Managers: who can work which weekday, and how many days off are coming up. */
function Overview({
  people,
  all,
}: {
  people: { id: string; full_name: string }[];
  all: Availability[];
}) {
  const today = londonToday();
  const end = addDays(today, 27);
  const cell = (id: string, day: number) => all.find(a => a.staff_id === id && a.weekday === day);
  const offDays = (id: string) =>
    all.filter(a => a.staff_id === id && a.on_date && a.on_date >= today && a.on_date <= end && !a.available);

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-lg font-semibold text-white">Team overview</h2>
      <p className="mb-3 text-sm text-amber-100/50">
        Green tick = available, red cross = not available, dash = hasn't said. Unavailable dates are for the next 4 weeks.
      </p>
      <Table
        head={
          <tr>
            <th className="px-4 py-3">Name</th>
            {WEEKDAYS.map(d => (
              <th key={d} className="px-2 py-3 text-center">
                {d.slice(0, 3)}
              </th>
            ))}
            <th className="px-4 py-3">Days off coming up</th>
          </tr>
        }
      >
        {people.map(p => {
          const off = offDays(p.id);
          return (
            <tr key={p.id}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-amber-50">{p.full_name}</td>
              {WEEKDAYS.map((d, i) => {
                const c = cell(p.id, i);
                return (
                  <td key={d} className="px-2 py-3 text-center">
                    {!c ? (
                      <Minus className="mx-auto h-4 w-4 text-amber-100/25" aria-label="Not set" />
                    ) : c.available ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-400" aria-label="Available" />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-red-400" aria-label="Not available" />
                    )}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-xs text-amber-100/70">
                {off.length ? (
                  <span title={off.map(a => formatDay(a.on_date!)).join(", ")}>
                    {off.length} day{off.length === 1 ? "" : "s"}:{" "}
                    {off
                      .slice(0, 3)
                      .map(a => formatDay(a.on_date!, { day: "numeric", month: "short" }))
                      .join(", ")}
                    {off.length > 3 ? "…" : ""}
                  </span>
                ) : (
                  "–"
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </section>
  );
}
