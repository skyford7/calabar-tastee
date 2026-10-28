import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage, supabase } from "@/lib/supabase";
import { qk, useOpeningHours } from "@/lib/queries";
import { hhmm } from "@/lib/format";
import type { OpeningHours } from "@/lib/types";
import {
  Button,
  Card,
  Checkbox,
  ErrorBlock,
  Input,
  LoadingBlock,
  PageHeader,
} from "../ui";

export function HoursPage() {
  const hours = useOpeningHours();
  if (hours.error) return <ErrorBlock error={hours.error} />;
  if (!hours.data) return <LoadingBlock />;
  // Re-mount the editor whenever fresh data arrives so it starts from the saved values.
  return <HoursEditor key={hours.dataUpdatedAt} saved={hours.data} />;
}

function HoursEditor({ saved }: { saved: OpeningHours[] }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<OpeningHours[]>(() =>
    saved.map(h => ({
      ...h,
      open_time: hhmm(h.open_time),
      close_time: hhmm(h.close_time),
    }))
  );

  const save = useMutation({
    mutationFn: async () => {
      for (const r of rows) {
        if (
          !r.is_closed &&
          (!r.open_time || !r.close_time || r.close_time <= r.open_time)
        ) {
          throw new Error(
            `${r.day_label}: closing time must be after opening time.`
          );
        }
      }
      const original = new Map(saved.map(h => [h.id, h]));
      const changed = rows.filter(r => {
        const o = original.get(r.id);
        return (
          !o ||
          o.is_closed !== r.is_closed ||
          hhmm(o.open_time) !== r.open_time ||
          hhmm(o.close_time) !== r.close_time
        );
      });
      for (const r of changed) {
        const { error } = await supabase
          .from("opening_hours")
          .update({
            is_closed: r.is_closed,
            open_time: r.is_closed ? null : r.open_time,
            close_time: r.is_closed ? null : r.close_time,
          })
          .eq("id", r.id);
        if (error) throw error;
      }
      return changed.length;
    },
    onSuccess: n => {
      toast.success(n ? "Opening hours saved" : "No changes to save");
      void qc.invalidateQueries({ queryKey: qk.hours });
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const update = (id: number, patch: Partial<OpeningHours>) =>
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <>
      <PageHeader
        title="Opening hours"
        description="Shown on the website and used for the open/closed banner. UK time."
        actions={
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Save changes
          </Button>
        }
      />
      <Card className="divide-y divide-amber-900/20">
        {rows.map(r => (
          <div
            key={r.id}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
          >
            <div className="w-32 font-medium text-white">{r.day_label}</div>
            <Checkbox
              label="Closed"
              checked={r.is_closed}
              onChange={v =>
                update(
                  r.id,
                  v
                    ? { is_closed: true }
                    : {
                        is_closed: false,
                        open_time: r.open_time || "12:00",
                        close_time: r.close_time || "19:00",
                      }
                )
              }
            />
            {!r.is_closed && (
              <div className="flex items-center gap-2 sm:ml-auto">
                <Input
                  type="time"
                  className="w-32"
                  value={r.open_time ?? ""}
                  onChange={e => update(r.id, { open_time: e.target.value })}
                />
                <span className="text-amber-100/40">to</span>
                <Input
                  type="time"
                  className="w-32"
                  value={r.close_time ?? ""}
                  onChange={e => update(r.id, { close_time: e.target.value })}
                />
              </div>
            )}
          </div>
        ))}
      </Card>
    </>
  );
}
