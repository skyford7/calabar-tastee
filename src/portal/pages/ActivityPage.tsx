import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queries";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { ActivityLog } from "@/lib/types";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Select,
} from "../ui";

const PAGE = 50;

const ENTITY_LABEL: Record<string, string> = {
  menu_items: "Menu item",
  categories: "Category",
  shifts: "Shift",
  user_roles: "Role",
  profiles: "Account",
  opening_hours: "Opening hours",
  availability: "Availability",
};

const FIELD_LABEL: Record<string, string> = {
  price: "price",
  is_available: "on website",
  is_active: "active",
  category_id: "category",
  start_time: "start",
  end_time: "end",
  shift_date: "date",
  staff_id: "person",
  open_time: "opens",
  close_time: "closes",
  is_closed: "closed",
  is_visible: "visible",
};

function show(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (field === "price") return formatPrice(Number(v));
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "string" && /^\d{2}:\d{2}:\d{2}$/.test(v))
    return v.slice(0, 5);
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

const availText = (v: unknown) => (v === true ? "Available" : v === false ? "Not available" : "Not set");

/** Availability entries read as plain sentences: "Mondays: Available → Not available". */
function AvailabilitySummary({ log }: { log: ActivityLog }) {
  const c = log.changes as { day?: string; was?: boolean | null; now?: boolean | null; note?: string | null; repeats?: boolean };
  return (
    <div className="text-amber-100/70">
      <span className="text-amber-100/40">{c.repeats ? "Every week, " : "One-off, "}</span>
      <span className="text-white">{c.day}</span>
      <span className="text-amber-100/40">: </span>
      {availText(c.was)} <span className="text-amber-500">→</span>{" "}
      <span className="text-white">{availText(c.now)}</span>
      {c.note && <span className="text-amber-100/50"> ({c.note})</span>}
    </div>
  );
}

function Summary({ log }: { log: ActivityLog }) {
  if (log.entity === "availability") return <AvailabilitySummary log={log} />;
  if (log.action !== "update") {
    return (
      <span className="text-amber-100/50">
        {log.action === "insert" ? "Created" : "Deleted"}
      </span>
    );
  }
  const entries = Object.entries(
    log.changes as Record<string, { old: unknown; new: unknown }>
  );
  return (
    <ul className="space-y-0.5">
      {entries.map(([k, v]) => (
        <li key={k} className="text-amber-100/70">
          <span className="text-amber-100/40">
            {FIELD_LABEL[k] ?? k.replace(/_/g, " ")}:
          </span>{" "}
          {show(k, v?.old)} <span className="text-amber-500">→</span>{" "}
          <span className="text-white">{show(k, v?.new)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ActivityPage() {
  const [entity, setEntity] = useState("all");

  const logs = useInfiniteQuery({
    queryKey: [...qk.activity, entity],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE - 1);
      if (entity !== "all") q = q.eq("entity", entity);
      const { data, error } = await q;
      if (error) throw error;
      return data as ActivityLog[];
    },
    getNextPageParam: (last, all) =>
      last.length === PAGE ? all.length * PAGE : undefined,
  });

  const rows = logs.data?.pages.flat() ?? [];

  return (
    <>
      <PageHeader
        title="Activity log"
        description="An automatic record of who changed what. Entries can't be edited or deleted from the portal."
        actions={
          <Select
            value={entity}
            onChange={e => setEntity(e.target.value)}
            className="w-48"
          >
            <option value="all">Everything</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        }
      />

      {logs.error ? (
        <ErrorBlock error={logs.error} />
      ) : logs.isLoading ? (
        <LoadingBlock />
      ) : !rows.length ? (
        <EmptyState title="No activity yet." />
      ) : (
        <>
          <div className="space-y-2">
            {rows.map(l => (
              <div
                key={l.id}
                className="grid gap-2 rounded-xl border border-amber-900/30 bg-[#231a14] p-3 text-sm sm:grid-cols-[180px_1fr]"
              >
                <div>
                  <div className="text-xs text-amber-100/40">
                    {formatDateTime(l.created_at)}
                  </div>
                  <div className="truncate text-amber-100/80">
                    {l.actor_email ?? "system"}
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        l.action === "delete"
                          ? "red"
                          : l.action === "insert"
                            ? "green"
                            : "amber"
                      }
                    >
                      {ENTITY_LABEL[l.entity] ?? l.entity}
                    </Badge>
                    {l.entity_label && (
                      <span className="font-medium text-white">
                        {l.entity_label}
                      </span>
                    )}
                    {l.entity === "shifts" && (
                      <span className="text-xs text-amber-100/40">
                        #{l.entity_id}
                      </span>
                    )}
                  </div>
                  <Summary log={l} />
                </div>
              </div>
            ))}
          </div>
          {logs.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void logs.fetchNextPage()}
                loading={logs.isFetchingNextPage}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
