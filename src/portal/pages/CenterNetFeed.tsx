import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Megaphone, Pencil, Pin, PinOff, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage, supabase } from "@/lib/supabase";
import type { Announcement, AnnouncementComment } from "@/lib/types";
import { Badge, Button, Card, Checkbox, EmptyState, ErrorBlock, Field, Input, LoadingBlock, Modal, PageHeader, Textarea, useConfirm } from "../ui";

const KEY = ["center-net"] as const;

type Feed = { posts: Announcement[]; comments: Map<number, AnnouncementComment[]> };

async function fetchFeed(): Promise<Feed> {
  const { data: posts, error } = await supabase
    .from("announcements")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  const ids = (posts ?? []).map(p => p.id as number);
  const comments = new Map<number, AnnouncementComment[]>();
  if (ids.length) {
    const { data: cs, error: cError } = await supabase
      .from("announcement_comments")
      .select("*")
      .in("announcement_id", ids)
      .order("created_at");
    if (cError) throw cError;
    for (const c of (cs ?? []) as AnnouncementComment[]) {
      const list = comments.get(c.announcement_id) ?? [];
      list.push(c);
      comments.set(c.announcement_id, list);
    }
  }
  return { posts: (posts ?? []) as Announcement[], comments };
}

const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
function ago(iso: string): string {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(s);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(s / 86400), "day");
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
}
const fullDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-600/20 text-xs font-semibold text-amber-300">
      {initials(name)}
    </div>
  );
}

function CommentBox({ postId }: { postId: number }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcement_comments").insert({ announcement_id: postId, body: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: e => toast.error(errorMessage(e)),
  });
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (text.trim()) add.mutate();
      }}
      className="flex gap-2"
    >
      <Input placeholder="Write a comment…" maxLength={2000} value={text} onChange={e => setText(e.target.value)} />
      <Button type="submit" size="md" variant="secondary" loading={add.isPending} disabled={!text.trim()} title="Comment">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

function PostCard({
  post,
  comments,
  onEdit,
}: {
  post: Announcement;
  comments: AnnouncementComment[];
  onEdit: (p: Announcement) => void;
}) {
  const { profile, can } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [showComments, setShowComments] = useState(true);
  const mine = post.author_id === profile?.id;
  const manager = can.manageStaff;

  const invalidate = () => void qc.invalidateQueries({ queryKey: KEY });

  const pin = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").update({ is_pinned: !post.is_pinned }).eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: e => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").delete().eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement deleted");
      invalidate();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const removeComment = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("announcement_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: e => toast.error(errorMessage(e)),
  });

  return (
    <Card className={post.is_pinned ? "border-amber-500/50 p-5" : "p-5"}>
      <div className="flex items-start gap-3">
        <Avatar name={post.author_name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">{post.author_name || "Team member"}</span>
            <span className="text-xs text-amber-100/40" title={fullDate(post.created_at)}>
              {ago(post.created_at)}
            </span>
            {post.is_pinned && (
              <Badge tone="amber">
                <Pin className="mr-1 h-3 w-3" /> Pinned
              </Badge>
            )}
          </div>
          <h3 className="mt-2 text-lg font-semibold text-amber-100">{post.title}</h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-100/80">{post.body}</p>
        </div>
        <div className="flex flex-shrink-0 gap-1">
          {manager && (
            <Button size="sm" variant="ghost" title={post.is_pinned ? "Unpin" : "Pin to top"} onClick={() => pin.mutate()}>
              {post.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
          )}
          {mine && (
            <Button size="sm" variant="ghost" title="Edit" onClick={() => onEdit(post)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {(mine || manager) && (
            <Button
              size="sm"
              variant="ghost"
              title="Delete"
              className="text-red-400"
              onClick={async () => {
                if (
                  await confirm({
                    title: "Delete announcement?",
                    message: "This removes the announcement and its comments for everyone.",
                    confirmLabel: "Delete",
                    danger: true,
                  })
                )
                  remove.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-amber-900/30 pt-3">
        <button
          onClick={() => setShowComments(v => !v)}
          className="mb-3 flex items-center gap-1.5 text-xs font-medium text-amber-100/60 hover:text-amber-300"
        >
          <MessageCircle className="h-4 w-4" />
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </button>
        {showComments && (
          <div className="space-y-3">
            {comments.map(c => (
              <div key={c.id} className="flex items-start gap-2">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-900/30 text-[10px] font-semibold text-amber-200">
                  {initials(c.author_name)}
                </div>
                <div className="min-w-0 flex-1 rounded-lg bg-[#1a1410] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">{c.author_name || "Team member"}</span>
                    <span className="text-[11px] text-amber-100/40" title={fullDate(c.created_at)}>
                      {ago(c.created_at)}
                    </span>
                    {(c.author_id === profile?.id || manager) && (
                      <button
                        onClick={() => removeComment.mutate(c.id)}
                        className="ml-auto text-amber-100/30 hover:text-red-400"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-amber-100/80">{c.body}</p>
                </div>
              </div>
            ))}
            <CommentBox postId={post.id} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function CenterNetFeed({ fallback }: { fallback: ReactNode }) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ title: "", body: "", pinned: false });
  const [editing, setEditing] = useState<{ id: number; title: string; body: string } | null>(null);

  const feed = useQuery({ queryKey: KEY, queryFn: fetchFeed, refetchInterval: 30_000 });

  const post = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("announcements")
        .insert({ title: draft.title.trim(), body: draft.body.trim(), is_pinned: can.manageStaff && draft.pinned });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft({ title: "", body: "", pinned: false });
      toast.success("Announcement posted");
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const saveEdit = useMutation({
    mutationFn: async (v: { id: number; title: string; body: string }) => {
      const { error } = await supabase
        .from("announcements")
        .update({ title: v.title.trim(), body: v.body.trim() })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      toast.success("Announcement updated");
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const onPost = (e: FormEvent) => {
    e.preventDefault();
    if (draft.title.trim() && draft.body.trim()) post.mutate();
  };

  // Tables not created yet: keep showing the construction screen.
  if (
    feed.error &&
    /announcements|42P01|PGRST205/i.test(
      `${(feed.error as { code?: string }).code ?? ""} ${(feed.error as Error).message ?? ""}`
    )
  )
    return <>{fallback}</>;

  return (
    <>
      <PageHeader title="Center Net" description="Team announcements. Everyone on the team can post and comment." />

      <Card className="mb-6 p-5">
        <form onSubmit={onPost} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
            <Megaphone className="h-4 w-4" /> New announcement
          </div>
          <Input
            placeholder="Title"
            maxLength={150}
            required
            value={draft.title}
            onChange={e => setDraft({ ...draft, title: e.target.value })}
          />
          <Textarea
            placeholder="What does the team need to know?"
            rows={4}
            maxLength={5000}
            required
            value={draft.body}
            onChange={e => setDraft({ ...draft, body: e.target.value })}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {can.manageStaff ? (
              <Checkbox label="Pin to top" checked={draft.pinned} onChange={v => setDraft({ ...draft, pinned: v })} />
            ) : (
              <span />
            )}
            <Button type="submit" loading={post.isPending} disabled={!draft.title.trim() || !draft.body.trim()}>
              <Send className="h-4 w-4" /> Post
            </Button>
          </div>
        </form>
      </Card>

      {feed.error ? (
        /announcements|42P01|PGRST205/i.test(
          `${(feed.error as { code?: string }).code ?? ""} ${(feed.error as Error).message ?? ""}`
        ) ? (
          <EmptyState title="Center Net is being set up.">It will appear here as soon as setup is finished.</EmptyState>
        ) : (
          <ErrorBlock error={feed.error} />
        )
      ) : feed.isLoading ? (
        <LoadingBlock />
      ) : !feed.data?.posts.length ? (
        <EmptyState title="No announcements yet.">Post the first one above.</EmptyState>
      ) : (
        <div className="space-y-4">
          {feed.data.posts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              comments={feed.data.comments.get(p.id) ?? []}
              onEdit={x => setEditing({ id: x.id, title: x.title, body: x.body })}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit announcement"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-announcement" loading={saveEdit.isPending}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <form
            id="edit-announcement"
            onSubmit={e => {
              e.preventDefault();
              saveEdit.mutate(editing);
            }}
            className="space-y-4"
          >
            <Field label="Title">
              <Input required maxLength={150} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
            </Field>
            <Field label="Message">
              <Textarea
                required
                rows={6}
                maxLength={5000}
                value={editing.body}
                onChange={e => setEditing({ ...editing, body: e.target.value })}
              />
            </Field>
          </form>
        )}
      </Modal>
    </>
  );
}
