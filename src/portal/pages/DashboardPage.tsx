import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  CalendarDays,
  MessageSquare,
  UtensilsCrossed,
  FileClock,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useMenuItems } from "@/lib/queries";
import {
  addDays,
  formatDay,
  hhmm,
  londonToday,
  shiftHours,
} from "@/lib/format";
import { portalPath } from "@/lib/env";
import type { Shift } from "@/lib/types";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader } from "../ui";

export function DashboardPage() {
  const { profile, can } = useAuth();
  const today = londonToday();
  const until = addDays(today, 14);

  const myShifts = useQuery({
    queryKey: ["my-shifts", profile?.id, today],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("staff_id", profile!.id)
        .eq("status", "published")
        .gte("shift_date", today)
        .lte("shift_date", until)
        .order("shift_date")
        .order("start_time");
      if (error) throw error;
      return data as Shift[];
    },
  });

  const menu = useMenuItems();

  const managerStats = useQuery({
    queryKey: ["manager-stats", today],
    enabled: can.manageShifts,
    queryFn: async () => {
      const [fb, drafts] = await Promise.all([
        supabase
          .from("feedback")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("shifts")
          .select("id", { count: "exact", head: true })
          .eq("status", "draft")
          .gte("shift_date", today),
      ]);
      return { newFeedback: fb.count ?? 0, draftShifts: drafts.count ?? 0 };
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const items = menu.data ?? [];
  const hidden = items.filter(i => !i.is_available).length;
  const weekHours = (myShifts.data ?? [])
    .filter(s => s.shift_date < addDays(today, 7))
    .reduce((h, s) => h + shiftHours(s.start_time, s.end_time), 0);

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName}`}
        description={formatDay(today, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<CalendarDays className="h-5 w-5" />}
          label="My hours, next 7 days"
          value={`${weekHours.toFixed(1)}h`}
          to="/roster"
        />
        <Stat
          icon={<UtensilsCrossed className="h-5 w-5" />}
          label="Menu items"
          value={String(items.length)}
          sub={hidden ? `${hidden} hidden from website` : undefined}
          to="/menu"
        />
        {can.manageShifts && (
          <>
            <Stat
              icon={<FileClock className="h-5 w-5" />}
              label="Unpublished shifts"
              value={String(managerStats.data?.draftShifts ?? "–")}
              to="/roster"
            />
            <Stat
              icon={<MessageSquare className="h-5 w-5" />}
              label="New feedback"
              value={String(managerStats.data?.newFeedback ?? "–")}
              to="/feedback"
            />
          </>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-white">
        My upcoming shifts
      </h2>
      {myShifts.isLoading ? (
        <LoadingBlock />
      ) : !myShifts.data?.length ? (
        <EmptyState title="No published shifts in the next two weeks.">
          <Link
            to={portalPath("/roster")}
            className="text-amber-400 hover:underline"
          >
            See the full roster
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {myShifts.data.map(s => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">
                  {formatDay(s.shift_date, {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                {s.shift_date === today && <Badge tone="amber">Today</Badge>}
              </div>
              <div className="mt-1 text-2xl font-bold text-amber-400">
                {hhmm(s.start_time)} – {hhmm(s.end_time)}
              </div>
              {(s.position || s.notes) && (
                <div className="mt-2 text-sm text-amber-100/60">
                  {s.position && (
                    <span className="font-medium text-amber-100/80">
                      {s.position}
                    </span>
                  )}
                  {s.position && s.notes && " · "}
                  {s.notes}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  to: string;
}) {
  return (
    <Link to={portalPath(to)}>
      <Card className="p-4 transition-colors hover:border-amber-500/40">
        <div className="flex items-center gap-2 text-amber-500">{icon}</div>
        <div className="mt-3 text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-amber-100/50">{label}</div>
        {sub && <div className="mt-1 text-xs text-amber-400/80">{sub}</div>}
      </Card>
    </Link>
  );
}
