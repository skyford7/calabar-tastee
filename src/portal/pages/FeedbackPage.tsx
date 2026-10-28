import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, Mail, MailOpen, Phone, Trash2 } from "lucide-react";
import { errorMessage, supabase } from "@/lib/supabase";
import { qk } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import type { Feedback, FeedbackStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  useConfirm,
} from "../ui";

const TABS: { key: FeedbackStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
];

export function FeedbackPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [tab, setTab] = useState<FeedbackStatus>("new");

  const feedback = useQuery({
    queryKey: qk.feedback,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Feedback[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: qk.feedback });

  const setStatus = useMutation({
    mutationFn: async (v: { id: number; status: FeedbackStatus }) => {
      const { error } = await supabase
        .from("feedback")
        .update({ status: v.status })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => void refresh(),
    onError: e => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback deleted");
      void refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const all = feedback.data ?? [];
  const list = all.filter(f => f.status === tab);

  return (
    <>
      <PageHeader
        title="Customer feedback"
        description="Messages sent through the contact form on the website."
      />

      <div className="mb-4 flex gap-1 rounded-lg border border-amber-900/30 bg-[#231a14] p-1 sm:inline-flex">
        {TABS.map(t => {
          const n = all.filter(f => f.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-md px-4 py-1.5 text-sm transition-colors sm:flex-none",
                tab === t.key
                  ? "bg-amber-600 text-white"
                  : "text-amber-100/60 hover:text-amber-200"
              )}
            >
              {t.label} {n > 0 && <span className="opacity-70">({n})</span>}
            </button>
          );
        })}
      </div>

      {feedback.error ? (
        <ErrorBlock error={feedback.error} />
      ) : feedback.isLoading ? (
        <LoadingBlock />
      ) : !list.length ? (
        <EmptyState title={`No ${tab} feedback.`} />
      ) : (
        <div className="space-y-3">
          {list.map(f => (
            <Card key={f.id} className="p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{f.name}</span>
                    <Badge tone={f.category === "Complaint" ? "red" : f.category === "Menu Suggestion" ? "blue" : "neutral"}>
                      {f.category ?? "Feedback"}
                    </Badge>
                    {f.status === "new" && <Badge tone="amber">New</Badge>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-amber-100/50">
                    <a
                      href={`mailto:${f.email}`}
                      className="inline-flex items-center gap-1 hover:text-amber-300"
                    >
                      <Mail className="h-3 w-3" /> {f.email}
                    </a>
                    {f.phone && (
                      <a
                        href={`tel:${f.phone}`}
                        className="inline-flex items-center gap-1 hover:text-amber-300"
                      >
                        <Phone className="h-3 w-3" /> {f.phone}
                      </a>
                    )}
                    <span>{formatDateTime(f.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {f.status !== "read" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setStatus.mutate({ id: f.id, status: "read" })
                      }
                    >
                      <MailOpen className="h-4 w-4" /> Mark read
                    </Button>
                  )}
                  {f.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setStatus.mutate({ id: f.id, status: "archived" })
                      }
                    >
                      <Archive className="h-4 w-4" /> Archive
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400"
                    title="Delete"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: "Delete feedback?",
                          message: "This can't be undone.",
                          confirmLabel: "Delete",
                          danger: true,
                        })
                      )
                        remove.mutate(f.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-amber-100/80">
                {f.comment}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
