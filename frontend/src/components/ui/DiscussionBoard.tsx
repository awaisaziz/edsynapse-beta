"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import {
  Globe,
  Loader2,
  Lock,
  MessageSquarePlus,
  Plus,
  Send,
  MessagesSquare,
  Pencil,
  Trash2,
  Check,
  X,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Markdown from "@/components/ui/Markdown";
import { useAuth } from "@/lib/useAuth";
import {
  discussionApi,
  teacherApi,
  type DiscussionAuthorRole,
  type DiscussionDetail,
  type DiscussionThread,
  type DiscussionVisibility,
  type CourseRole,
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

function Avatar({ initials, role, isAnonymous }: { initials: string; role: DiscussionAuthorRole; isAnonymous?: boolean }) {
  const tone = isAnonymous ? "bg-slate-400" : (role === "teacher" ? "bg-primary" : "bg-slate-500");
  return (
    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white", tone)}>
      {initials}
    </div>
  );
}

export function DiscussionBoard({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [role, setRole] = useState<CourseRole>("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Composer
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<DiscussionVisibility>("public");
  const [postAnonymously, setPostAnonymously] = useState(false);
  const [posting, setPosting] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Thread detail
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DiscussionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [replyAnonymously, setReplyAnonymously] = useState(false);
  const [replying, setReplying] = useState(false);

  // Editing state
  const [editingThread, setEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState("");

  // Custom states for delete confirm & inline answer composition
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "thread" | "reply"; id: string } | null>(null);
  const [composingAnswer, setComposingAnswer] = useState(false);
  const [newAnswerText, setNewAnswerText] = useState("");
  const [newAnswerAnonymous, setNewAnswerAnonymous] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const { threads, role: courseRole } = await discussionApi.list(courseId);
      setThreads(threads);
      setRole(courseRole);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load discussions.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Load students for teachers when composing private threads
  useEffect(() => {
    if (composing && visibility === "private" && role === "owner" && students.length === 0) {
      teacherApi
        .getAnalytics(courseId)
        .then((analytics) => {
          setStudents(analytics.students || []);
        })
        .catch(() => {});
    }
  }, [composing, visibility, role, courseId, students.length]);

  const openThread = useCallback(
    async (id: string) => {
      setComposing(false);
      setActiveId(id);
      setDetail(null);
      setDetailLoading(true);
      setEditingThread(false);
      setEditingPostId(null);
      setReplyAnonymously(false);
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

    if (visibility === "private" && role === "owner" && !selectedStudentId) {
      alert("Please select a student for this private discussion.");
      return;
    }

    setPosting(true);
    try {
      const { thread } = await discussionApi.create(courseId, {
        title: title.trim(),
        body: body.trim(),
        visibility,
        recipientId: visibility === "private" && role === "owner" ? selectedStudentId : null,
        anonymous: postAnonymously,
      });
      setThreads((prev) => [thread, ...prev]);
      setTitle("");
      setBody("");
      setVisibility("public");
      setSelectedStudentId("");
      setPostAnonymously(false);
      setComposing(false);
      setActiveId(thread.id);
      setDetail(thread);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the thread.");
    } finally {
      setPosting(false);
    }
  }, [courseId, title, body, visibility, posting, role, selectedStudentId, postAnonymously]);

  const submitReply = useCallback(async () => {
    if (!reply.trim() || !activeId || replying) return;
    setReplying(true);
    try {
      const { thread } = await discussionApi.reply(courseId, activeId, reply.trim(), replyAnonymously);
      setDetail(thread);
      setReply("");
      setReplyAnonymously(false);
      // Bump the thread to the top of the list with its new reply count.
      setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post the reply.");
    } finally {
      setReplying(false);
    }
  }, [courseId, activeId, reply, replying, replyAnonymously]);

  // Edit thread actions
  const startEditThread = () => {
    if (!detail) return;
    setEditTitle(detail.title);
    setEditBody(detail.body);
    setEditingThread(true);
  };

  const saveEditThread = async () => {
    if (!detail || !editTitle.trim()) return;
    try {
      const { thread } = await discussionApi.update(courseId, detail.id, {
        title: editTitle.trim(),
        body: editBody.trim(),
      });
      setDetail(thread);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? thread : t)));
      setEditingThread(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update thread.");
    }
  };

  // Toggle visibility of existing thread
  const handleToggleVisibility = async (newVisibility: DiscussionVisibility) => {
    if (!detail) return;
    try {
      const { thread } = await discussionApi.update(courseId, detail.id, {
        visibility: newVisibility,
      });
      setDetail(thread);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? thread : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update visibility.");
    }
  };

  // Delete thread
  const handleDeleteThread = (id: string) => {
    setDeleteConfirm({ type: "thread", id });
  };

  const confirmDeleteThread = async (id: string) => {
    try {
      await discussionApi.delete(courseId, id);
      setThreads((prev) => prev.filter((t) => t.id !== id));
      setActiveId(null);
      setDetail(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete thread.");
    }
  };

  // Edit reply actions
  const startEditPost = (postId: string, currentText: string) => {
    setEditingPostId(postId);
    setEditPostText(currentText);
  };

  const saveEditPost = async (postId: string) => {
    if (!activeId || !editPostText.trim()) return;
    try {
      const { thread } = await discussionApi.updateReply(courseId, activeId, postId, editPostText.trim());
      setDetail(thread);
      setEditingPostId(null);
      setEditPostText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update reply.");
    }
  };

  // Delete reply
  const handleDeletePost = (postId: string) => {
    setDeleteConfirm({ type: "reply", id: postId });
  };

  const confirmDeletePost = async (postId: string) => {
    if (!activeId) return;
    try {
      const { thread } = await discussionApi.deleteReply(courseId, activeId, postId);
      setDetail(thread);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? thread : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete reply.");
    }
  };

  // Upvote reply
  const handleUpvotePost = async (postId: string) => {
    if (!activeId) return;
    try {
      const { thread } = await discussionApi.upvoteReply(courseId, activeId, postId);
      setDetail(thread);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? thread : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upvote reply.");
    }
  };

  // Client-side local search filtering
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.author.name.toLowerCase().includes(q)
      );
    });
  }, [threads, searchQuery]);

  // Piazza split replies: 1st reply is "The Answer", subsequent are "Follow-up Discussions"
  const { firstReply, followUps } = useMemo(() => {
    if (!detail || !detail.posts || detail.posts.length === 0) {
      return { firstReply: null, followUps: [] };
    }
    return {
      firstReply: detail.posts[0],
      followUps: detail.posts.slice(1),
    };
  }, [detail]);

  return (
    <div className="flex flex-1 min-w-0 min-h-0 w-full h-full gap-4 relative overflow-hidden font-sans">
      {/* ── Sidebar: Thread List ── */}
      <aside className="w-80 md:w-96 shrink-0 flex flex-col border border-white/50 bg-white/35 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm">
        {/* Sidebar Header & Search */}
        <div className="p-4 border-b border-black/5 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-foreground font-display">
                <MessagesSquare className="w-4 h-4 text-primary" />
                Discussions
              </h2>
            </div>
            <button
              onClick={() => {
                setComposing(true);
                setActiveId(null);
                setDetail(null);
              }}
              className="flex h-8 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-[11px] font-bold text-white transition-all hover:bg-primary/95 shadow-sm active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New thread</span>
            </button>
          </div>
          <input
            type="text"
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary focus:bg-white transition-all"
          />
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto chat-scroll p-2 space-y-1.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs font-semibold gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Loading discussions…</span>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {searchQuery ? "No discussions match your search." : "No discussion threads yet."}
            </div>
          ) : (
            filteredThreads.map((t) => {
              const active = activeId === t.id && !composing;
              return (
                <button
                  key={t.id}
                  onClick={() => openThread(t.id)}
                  className={cn(
                    "flex w-full flex-col gap-1.5 rounded-2xl border p-3 text-left transition-all active:scale-[0.99]",
                    active
                      ? "border-primary/30 bg-white shadow-sm ring-1 ring-primary/15"
                      : "border-transparent hover:bg-white hover:border-primary/10 hover:shadow-sm",
                  )}
                >
                  <div className="flex items-start justify-between gap-1.5 w-full">
                    <div className="min-w-0 flex-1 flex flex-col">
                      <p className="text-xs font-bold text-foreground line-clamp-1">{t.title}</p>
                      {t.isAnonymous && (
                        <span className="text-[9px] text-amber-600 font-semibold mt-0.5">👤 Posted Anonymously</span>
                      )}
                    </div>
                    {t.visibility === "private" ? (
                      <Lock className="mt-0.5 w-3.5 h-3.5 shrink-0 text-amber-600" />
                    ) : (
                      <Globe className="mt-0.5 w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                    )}
                  </div>
                  {t.body && <p className="text-[10px] text-muted-foreground line-clamp-1">{t.body}</p>}
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground w-full">
                    <span className="font-semibold text-foreground/80 truncate max-w-[80px]">{t.author.name}</span>
                    <RoleBadge role={t.author.role} />
                    <span>· {relativeTime(t.updatedAt)}</span>
                    <span className="ml-auto flex items-center gap-0.5 font-bold shrink-0">
                      <MessagesSquare className="w-2.5 h-2.5" />
                      {t.replyCount}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Main Detail Pane ── */}
      <main className="flex-1 min-w-0 flex flex-col border border-white/50 bg-white/35 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm">
        {error && (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-600 flex justify-between items-center shrink-0">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-rose-600 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {composing ? (
          /* Composer View */
          <div className="flex-1 flex flex-col overflow-y-auto chat-scroll p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground font-display flex items-center gap-1.5">
                <MessageSquarePlus className="w-4 h-4 text-primary" />
                Start a new discussion
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ask questions or share ideas with the course cohort.</p>
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-start">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Question or topic title…"
                className="w-full rounded-xl border border-primary/10 bg-white px-3.5 py-3 text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add details (optional)…"
                rows={8}
                className="w-full resize-none rounded-xl border border-primary/10 bg-white px-3.5 py-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 flex-1 min-h-[120px]"
              />

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-black/5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 rounded-xl border border-white bg-white/70 p-1">
                    {(["public", "private"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setVisibility(v)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-extrabold transition-all",
                          visibility === v
                            ? "bg-primary text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {v === "public" ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {v === "public" ? "Public" : "Private"}
                      </button>
                    ))}
                  </div>

                  {/* Anonymous checkbox */}
                  {role !== "owner" && (
                    <label className="flex items-center gap-2 cursor-pointer border border-white bg-white/70 rounded-xl px-3 py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={postAnonymously}
                        onChange={(e) => setPostAnonymously(e.target.checked)}
                        className="rounded text-primary focus:ring-primary/20"
                      />
                      <span>Post Anonymously</span>
                    </label>
                  )}
                </div>

                {role === "owner" && visibility === "private" && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground shrink-0">Talk to Student:</span>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="rounded-xl border border-primary/10 bg-white px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-primary"
                    >
                      <option value="">-- Select --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setComposing(false);
                      setActiveId(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitThread}
                    disabled={!title.trim() || posting}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white transition-all hover:bg-primary/95 disabled:opacity-50 active:scale-[0.97]"
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquarePlus className="w-4 h-4" />}
                    <span>Post thread</span>
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {visibility === "private"
                  ? role === "owner"
                    ? "Private — visible only to you and the selected student."
                    : "Private — only you and the teaching staff can see this."
                  : "Public — everyone enrolled can see and reply."}
                {postAnonymously && " (Anonymity enabled: other students will not see your identity; teachers will see it)"}
              </p>
            </div>
          </div>
        ) : !activeId ? (
          /* Empty Selection View */
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <MessagesSquare className="mb-2 size-8 text-primary/30" />
            <p className="text-xs font-bold">No thread selected</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Select a thread in the sidebar or start a new one.</p>
          </div>
        ) : detailLoading || !detail ? (
          /* Detail Loading View */
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
            <p className="text-xs font-bold">Loading discussion thread…</p>
          </div>
        ) : (
          /* Detail View */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-black/5 bg-white/40 px-6 py-3.5 shrink-0">
              <div className="min-w-0 flex-1">
                {editingThread ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-primary/20 bg-white px-2.5 py-1.5 text-xs font-bold text-foreground outline-none"
                    autoFocus
                  />
                ) : (
                  <h3 className="text-sm font-black text-foreground font-display leading-tight truncate">
                    {detail.title}
                  </h3>
                )}
                {/* Recipient / Anonymity meta */}
                <div className="flex items-center gap-2 mt-0.5">
                  {detail.visibility === "private" && (
                    <p className="text-[9px] text-amber-700 font-semibold">
                      Private discussion {detail.recipient ? `with student: ${detail.recipient.name}` : "with teaching staff"}
                    </p>
                  )}
                  {detail.isAnonymous && (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-200">
                      👤 Anonymous to students
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Visibility Changer (Author or Teacher) */}
                {(role === "owner" || (user && user.id === detail.author.id)) ? (
                  <select
                    value={detail.visibility}
                    onChange={(e) => handleToggleVisibility(e.target.value as DiscussionVisibility)}
                    className="rounded-full border border-primary/20 bg-white px-2 py-0.5 text-[10px] font-bold text-primary outline-none cursor-pointer focus:ring-1 focus:ring-primary/25"
                  >
                    <option value="public">🌐 Public</option>
                    <option value="private">🔒 Private</option>
                  </select>
                ) : (
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
                      detail.visibility === "private"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-primary/15 bg-primary/5 text-primary",
                    )}
                  >
                    {detail.visibility === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    <span>{detail.visibility}</span>
                  </span>
                )}

                {/* Edit & Delete Thread Actions */}
                {!editingThread && user && user.id === detail.author.id && (
                  <button
                    onClick={startEditThread}
                    title="Edit thread"
                    className="p-1.5 rounded-lg border border-black/5 hover:bg-white text-muted-foreground hover:text-foreground transition-all active:scale-95"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {(role === "owner" || (user && user.id === detail.author.id)) && (
                  <button
                    onClick={() => handleDeleteThread(detail.id)}
                    title="Delete thread"
                    className="p-1.5 rounded-lg border border-red-200/10 hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-all active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto chat-scroll px-6 py-4 space-y-5">
              {/* Original Question Card */}
              <div className="bg-white/40 border border-white/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Avatar initials={detail.author.initials} role={detail.author.role} isAnonymous={detail.isAnonymous && detail.author.name === "Anonymous Student"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground">
                        {detail.author.name}
                        {detail.isAnonymous && detail.author.name !== "Anonymous Student" && (
                          <span className="ml-1.5 text-[9px] font-bold text-amber-700 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-200/35">
                            Anonymous to students
                          </span>
                        )}
                      </span>
                      <RoleBadge role={detail.author.role} />
                      <span className="text-[10px] text-muted-foreground">· {relativeTime(detail.createdAt)}</span>
                    </div>

                    {editingThread ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={4}
                          className="w-full resize-none rounded-xl border border-primary/15 bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingThread(false)}
                            className="flex h-7 items-center gap-1 rounded-lg border border-black/5 bg-white px-2.5 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={saveEditThread}
                            className="flex h-7 items-center gap-1 rounded-lg bg-primary px-3 text-[10px] font-bold text-white hover:bg-primary/95"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      detail.body && (
                        <div className="mt-2 text-xs leading-relaxed text-foreground/85">
                          <Markdown>{detail.body}</Markdown>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Piazza layout element 1: The Answer */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-black/5 pb-1">
                  The Answer
                </h4>
                {firstReply ? (
                  <div className="group bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 relative space-y-2">
                    <div className="flex items-start gap-2.5">
                      <Avatar initials={firstReply.author.initials} role={firstReply.author.role} isAnonymous={firstReply.anonymous && firstReply.author.name === "Anonymous Student"} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground">
                            {firstReply.author.name}
                            {firstReply.anonymous && firstReply.author.name !== "Anonymous Student" && (
                              <span className="ml-1.5 text-[9px] font-bold text-amber-700 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-200/35">
                                Anonymous to students
                              </span>
                            )}
                          </span>
                          <RoleBadge role={firstReply.author.role} />
                          <span className="text-[10px] text-muted-foreground">· {relativeTime(firstReply.createdAt)}</span>

                          {/* Upvote Button */}
                          <button
                            onClick={() => handleUpvotePost(firstReply.id)}
                            className={cn(
                              "ml-3 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition",
                              firstReply.upvotedByMe
                                ? "bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30"
                                : "bg-black/5 text-muted-foreground hover:bg-black/10 hover:text-foreground"
                            )}
                          >
                            <ThumbsUp className={cn("w-3.5 h-3.5", firstReply.upvotedByMe && "fill-emerald-700")} />
                            <span>{firstReply.upvoteCount ?? 0}</span>
                          </button>

                          {/* Reply Action Controls */}
                          {editingPostId !== firstReply.id && (
                            <div className="ml-auto flex items-center gap-1.5 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                              {user && (
                                <button
                                  onClick={() => startEditPost(firstReply.id, firstReply.body)}
                                  title="Edit answer (Wiki Edit)"
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 border border-emerald-500/20 shadow-sm"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span className="text-[9px] font-extrabold tracking-wide uppercase">Edit Answer</span>
                                </button>
                              )}
                              {(role === "owner" || (user && user.id === firstReply.author.id)) && (
                                <button
                                  onClick={() => handleDeletePost(firstReply.id)}
                                  title="Delete reply"
                                  className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {editingPostId === firstReply.id ? (
                          <div className="mt-2 space-y-1.5">
                            <textarea
                              value={editPostText}
                              onChange={(e) => setEditPostText(e.target.value)}
                              rows={2}
                              className="w-full resize-none rounded-xl border border-primary/15 bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                            />
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingPostId(null)}
                                className="flex h-6 items-center gap-0.5 rounded-lg border border-black/5 bg-white px-2 text-[9px] font-bold text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-2.5 h-2.5" />
                                <span>Cancel</span>
                              </button>
                              <button
                                onClick={() => saveEditPost(firstReply.id)}
                                className="flex h-6 items-center gap-0.5 rounded-lg bg-primary px-2 text-[9px] font-bold text-white hover:bg-primary/95"
                              >
                                <Check className="w-2.5 h-2.5" />
                                <span>Save</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 text-xs leading-relaxed text-foreground/85">
                            <Markdown>{firstReply.body}</Markdown>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : composingAnswer ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                    <h5 className="text-xs font-bold text-foreground">Compose The Answer</h5>
                    <textarea
                      value={newAnswerText}
                      onChange={(e) => setNewAnswerText(e.target.value)}
                      placeholder="Type the official answer here..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-emerald-500/20 bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                    />
                    <div className="flex items-center justify-between gap-3">
                      {role !== "owner" && (
                        <label className="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={newAnswerAnonymous}
                            onChange={(e) => setNewAnswerAnonymous(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500/20"
                          />
                          <span>Reply Anonymously</span>
                        </label>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setComposingAnswer(false);
                            setNewAnswerText("");
                            setNewAnswerAnonymous(false);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!newAnswerText.trim() || !activeId) return;
                            try {
                              const { thread } = await discussionApi.reply(
                                courseId,
                                activeId,
                                newAnswerText.trim(),
                                newAnswerAnonymous
                              );
                              setDetail(thread);
                              setNewAnswerText("");
                              setNewAnswerAnonymous(false);
                              setComposingAnswer(false);
                              setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Couldn't add the answer.");
                            }
                          }}
                          className="flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Submit Answer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground bg-white/10 rounded-2xl border border-dashed border-black/5 flex flex-col items-center justify-center gap-3">
                    <p>No answer posted yet. Be the first to answer.</p>
                    <button
                      onClick={() => setComposingAnswer(true)}
                      className="flex h-8 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[11px] font-bold text-white transition-all hover:bg-emerald-700 shadow-sm active:scale-[0.97]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add the Answer</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Piazza layout element 2: Follow-up Discussions */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-black/5 pb-1">
                  Follow-up Discussions ({followUps.length})
                </h4>

                {followUps.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-muted-foreground">
                    No follow-up questions or comments yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {followUps.map((p) => {
                      const editing = editingPostId === p.id;
                      return (
                        <div key={p.id} className="group/post flex items-start gap-2.5 border-b border-black/5 pb-3">
                          <Avatar initials={p.author.initials} role={p.author.role} isAnonymous={p.anonymous && p.author.name === "Anonymous Student"} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground">
                                {p.author.name}
                                {p.anonymous && p.author.name !== "Anonymous Student" && (
                                  <span className="ml-1.5 text-[9px] font-bold text-amber-700 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-200/35">
                                    Anonymous to students
                                  </span>
                                )}
                              </span>
                              <RoleBadge role={p.author.role} />
                              <span className="text-[10px] text-muted-foreground">· {relativeTime(p.createdAt)}</span>

                              {/* Upvote Button */}
                              <button
                                onClick={() => handleUpvotePost(p.id)}
                                className={cn(
                                  "ml-3 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition",
                                  p.upvotedByMe
                                    ? "bg-primary/20 text-primary hover:bg-primary/30"
                                    : "bg-black/5 text-muted-foreground hover:bg-black/10 hover:text-foreground"
                                )}
                              >
                                <ThumbsUp className={cn("w-3.5 h-3.5", p.upvotedByMe && "fill-primary")} />
                                <span>{p.upvoteCount ?? 0}</span>
                              </button>

                              {/* Reply Action Controls */}
                              {!editing && (
                                <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/post:opacity-100 transition-opacity">
                                  {user && user.id === p.author.id && (
                                    <button
                                      onClick={() => startEditPost(p.id, p.body)}
                                      title="Edit reply"
                                      className="p-1 rounded hover:bg-white text-muted-foreground hover:text-foreground"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
                                  {(role === "owner" || (user && user.id === p.author.id)) && (
                                    <button
                                      onClick={() => handleDeletePost(p.id)}
                                      title="Delete reply"
                                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {editing ? (
                              <div className="mt-2 space-y-1.5">
                                <textarea
                                  value={editPostText}
                                  onChange={(e) => setEditPostText(e.target.value)}
                                  rows={2}
                                  className="w-full resize-none rounded-xl border border-primary/15 bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                />
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setEditingPostId(null)}
                                    className="flex h-6 items-center gap-0.5 rounded-lg border border-black/5 bg-white px-2 text-[9px] font-bold text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                    <span>Cancel</span>
                                  </button>
                                  <button
                                    onClick={() => saveEditPost(p.id)}
                                    className="flex h-6 items-center gap-0.5 rounded-lg bg-primary px-2 text-[9px] font-bold text-white hover:bg-primary/95"
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Save</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 text-xs leading-relaxed text-foreground/85 font-sans">
                                <Markdown>{p.body}</Markdown>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Reply Input Box */}
            <div className="mt-auto flex flex-col gap-2 border-t border-black/5 bg-white/40 p-4 shrink-0">
              <div className="flex items-center justify-between gap-3">
                {/* Reply Anonymously Checkbox */}
                {role !== "owner" && (
                  <label className="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={replyAnonymously}
                      onChange={(e) => setReplyAnonymously(e.target.checked)}
                      className="rounded text-primary focus:ring-primary/20"
                    />
                    <span>Reply Anonymously</span>
                  </label>
                )}
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      submitReply();
                    }
                  }}
                  placeholder="Write a reply…  (Ctrl/⌘+Enter to send)"
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-primary/10 bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <button
                  onClick={submitReply}
                  disabled={!reply.trim() || replying}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all hover:bg-primary/95 disabled:opacity-40 active:scale-95 shadow-sm"
                >
                  {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="absolute inset-0" onClick={() => setDeleteConfirm(null)} />
          <div className="liquid-shell relative w-full max-w-sm overflow-hidden rounded-[26px] p-3 shadow-2xl edsynapse-stagger">
            <div className="rounded-[20px] border border-white/70 bg-[#fbfbfd]/95 p-5 shadow-inner backdrop-blur-xl text-center">
              <h4 className="text-sm font-bold text-foreground font-display mb-2">
                Confirm Deletion
              </h4>
              <p className="text-xs text-muted-foreground mb-5">
                Are you sure you want to delete this {deleteConfirm.type === "thread" ? "discussion thread" : "reply"}? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-black/5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const { type, id } = deleteConfirm;
                    setDeleteConfirm(null);
                    if (type === "thread") {
                      await confirmDeleteThread(id);
                    } else {
                      await confirmDeletePost(id);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-md shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
