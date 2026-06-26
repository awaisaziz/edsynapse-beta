"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Loader2, Lock, MessageSquarePlus, Plus, Send, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  discussionApi,
  type DiscussionAuthorRole,
  type DiscussionDetail,
  type DiscussionThread,
  type DiscussionVisibility,
} from "@/lib/edsynapseApi";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

const ROLE_BADGE: Record<DiscussionAuthorRole, { label: string; cls: string }> = {
  teacher: { label: "Teacher", cls: "bg-primary/10 text-primary border-primary/15" },
  student: { label: "Student", cls: "bg-black/5 text-muted-foreground border-black/10" },
};

function RoleBadge({ role }: { role: DiscussionAuthorRole }) {
  const b = ROLE_BADGE[role];
  return (
    <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide", b.cls)}>
      {b.label}
    </span>
  );
}

function Avatar({ initials, role }: { initials: string; role: DiscussionAuthorRole }) {
  const tone = role === "teacher" ? "bg-primary" : "bg-slate-400";
  return (
    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white", tone)}>
      {initials}
    </div>
  );
}

/**
 * Piazza-style course discussion board. Members start threads (public or
 * private), and everyone who can see a thread can reply. Used on both the
 * teacher course page and the student class page.
 */
export function DiscussionBoard({ courseId }: { courseId: string }) {
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<DiscussionVisibility>("public");
  const [posting, setPosting] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DiscussionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const { threads } = await discussionApi.list(courseId);
      setThreads(threads);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load discussions.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const openThread = useCallback(
    async (id: string) => {
      setActiveId(id);
      setDetail(null);
      setDetailLoading(true);
      try {
        const { thread } = await discussionApi.get(courseId, id);
        setDetail(thread);
      } catch {
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [courseId],
  );

  const submitThread = useCallback(async () => {
    if (!title.trim() || posting) return;
    setPosting(true);
    try {
      const { thread } = await discussionApi.create(courseId, { title: title.trim(), body: body.trim(), visibility });
      setThreads((prev) => [thread, ...prev]);
      setTitle("");
      setBody("");
      setVisibility("public");
      setComposing(false);
      setActiveId(thread.id);
      setDetail(thread);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the thread.");
    } finally {
      setPosting(false);
    }
  }, [courseId, title, body, visibility, posting]);

  const submitReply = useCallback(async () => {
    if (!reply.trim() || !activeId || replying) return;
    setReplying(true);
    try {
      const { thread } = await discussionApi.reply(courseId, activeId, reply.trim());
      setDetail(thread);
      setReply("");
      // Bump the thread to the top of the list with its new reply count.
      setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post the reply.");
    } finally {
      setReplying(false);
    }
  }, [courseId, activeId, reply, replying]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-foreground font-display">
            <MessagesSquare className="w-4 h-4 text-primary" />
            Discussion Board
          </h2>
          <p className="text-[11px] text-muted-foreground">Ask questions, share answers. Private threads stay between you and the teaching staff.</p>
        </div>
        <button
          onClick={() => setComposing((v) => !v)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white transition-all hover:bg-primary/95 shadow shadow-primary/20 active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" />
          <span>New thread</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600">{error}</div>
      )}

      {composing && (
        <div className="rounded-[20px] border border-primary/15 bg-white/60 p-4 shadow-sm backdrop-blur-xl space-y-3 edsynapse-stagger">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Question or topic title…"
            className="w-full rounded-xl border border-primary/15 bg-white px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add details (optional)…"
            rows={3}
            className="w-full resize-none rounded-xl border border-primary/15 bg-white px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-white/70 bg-white/70 p-1">
              {(["public", "private"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all",
                    visibility === v ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "public" ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {v === "public" ? "Public" : "Private"}
                </button>
              ))}
            </div>
            <button
              onClick={submitThread}
              disabled={!title.trim() || posting}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white transition-all hover:bg-primary/95 disabled:opacity-50 active:scale-[0.97]"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquarePlus className="w-4 h-4" />}
              <span>Post thread</span>
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {visibility === "private"
              ? "Private — only you and the teacher can see this."
              : "Public — everyone enrolled can see and reply."}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading discussions…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
          {/* Thread list */}
          <div className="space-y-2">
            {threads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/15 bg-white/20 p-8 text-center">
                <MessagesSquare className="mx-auto mb-2 size-6 text-primary/50" />
                <p className="text-xs font-bold text-foreground">No threads yet</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Start the first one with “New thread”.</p>
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openThread(t.id)}
                  className={cn(
                    "flex w-full flex-col gap-1.5 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99]",
                    activeId === t.id
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : "border-white/70 bg-white/50 hover:border-primary/15 hover:bg-white/70",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-[13px] font-bold text-foreground line-clamp-2">{t.title}</p>
                    {t.visibility === "private" ? (
                      <Lock className="mt-0.5 w-3.5 h-3.5 shrink-0 text-amber-600" />
                    ) : (
                      <Globe className="mt-0.5 w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{t.author.name}</span>
                    <RoleBadge role={t.author.role} />
                    <span>· {relativeTime(t.updatedAt)}</span>
                    <span className="ml-auto flex items-center gap-1 font-bold">
                      <MessagesSquare className="w-3 h-3" />
                      {t.replyCount}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Thread detail */}
          <div className="liquid-panel rounded-3xl p-5 min-h-[320px]">
            {!activeId ? (
              <div className="flex h-full flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <MessagesSquare className="mb-2 size-7 text-primary/40" />
                <p className="text-xs font-semibold">Select a thread to read and reply.</p>
              </div>
            ) : detailLoading || !detail ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading thread…
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="space-y-3 border-b border-white/50 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-black text-foreground font-display leading-tight">{detail.title}</h3>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shrink-0",
                        detail.visibility === "private"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-primary/15 bg-primary/5 text-primary",
                      )}
                    >
                      {detail.visibility === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      {detail.visibility}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Avatar initials={detail.author.initials} role={detail.author.role} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{detail.author.name}</span>
                        <RoleBadge role={detail.author.role} />
                        <span className="text-[10px] text-muted-foreground">· {relativeTime(detail.createdAt)}</span>
                      </div>
                      {detail.body && <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">{detail.body}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-4 py-4">
                  {detail.posts.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">No replies yet — be the first to answer.</p>
                  ) : (
                    detail.posts.map((p) => (
                      <div key={p.id} className="flex items-start gap-2.5">
                        <Avatar initials={p.author.initials} role={p.author.role} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{p.author.name}</span>
                            <RoleBadge role={p.author.role} />
                            <span className="text-[10px] text-muted-foreground">· {relativeTime(p.createdAt)}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">{p.body}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-auto flex items-end gap-2 border-t border-white/50 pt-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitReply();
                    }}
                    placeholder="Write a reply…  (Ctrl/⌘+Enter to send)"
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-primary/15 bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                  <button
                    onClick={submitReply}
                    disabled={!reply.trim() || replying}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all hover:bg-primary/95 disabled:opacity-40 active:scale-95"
                  >
                    {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
