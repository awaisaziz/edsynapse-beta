"use client";

import { use, useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Layers,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Network,
  Volume2,
  Zap,
  Send,
  Trophy,
  X,
  Compass,
  Sparkles,
  BookOpen,
  ArrowRight,
  BookOpenText,
  Plus,
  Upload,
  PlayCircle,
  PauseCircle,
  Trash2,
  RotateCcw,
  FolderOpen,
  GraduationCap,
  MessageCircle,
  HelpCircle,
  ClipboardCheck,
  Eye,
  CheckCircle2,
  Download,
  Link2,
  Pencil,
  Check,
  Copy,
  AlertTriangle,
  Play,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Markdown from "@/components/ui/Markdown";
import { QuizCard } from "@/components/ui/QuizCard";
import { DiscussionBoard } from "@/components/ui/DiscussionBoard";
import { useAuth } from "@/lib/useAuth";
import { useResizableSidebar } from "@/lib/useResizableSidebar";
import {
  studentApi,
  type SmartNotes,
  type Flashcard,
  type Course,
  type CourseLesson,
  type StudyMaterialVersion,
  type DiagnosticQuiz,
  type StrengthsGaps,
} from "@/lib/edsynapseApi";

// Colour for a lesson's mastery %, matching scoreToLevel thresholds
// (strong ≥75, moderate ≥45, else needs work). Untouched lessons read muted.
function masteryTone(progress: number, attempted: number): string {
  if (attempted === 0) return "#9CA3AF"; // not started — muted
  if (progress >= 75) return "#22C55E"; // success
  if (progress >= 45) return "#F59E0B"; // warning
  return "#EF4444"; // danger
}

// Small hover-reveal button that copies a message's text to the clipboard.
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      onClick={copy}
      title={copied ? "Copied!" : "Copy"}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/60 bg-white/70 text-muted-foreground shadow-sm transition-all hover:text-primary hover:border-primary/20 active:scale-95",
        className,
      )}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

type ClassView = "course" | "learning" | "tutor" | "socratic" | "board";

type Mode = "notes" | "flashcards" | "podcast" | "visual";

const MODES: { id: Mode; icon: any; label: string; color: string }[] = [
  { id: "notes",      icon: FileText,  label: "Smart Notes",  color: "#0066cc" },
  { id: "flashcards", icon: Layers,    label: "Flashcards",   color: "#8b5cf6" },
  { id: "podcast",    icon: Volume2,   label: "Audio Podcast",color: "#10b981" },
  { id: "visual",     icon: Network,   label: "Mind Map",     color: "#f59e0b" },
];

// ── Smart Notes View ─────────────────────────────────────────────────────────
function NotesView({ notes, loading }: { notes: SmartNotes | null; loading: boolean }) {
  if (loading || !notes) return (
    <div className="flex flex-col items-center justify-center py-20 text-center edsynapse-stagger">
      <div className="mb-4 w-10 h-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      <p className="text-xs font-semibold text-muted-foreground">Generating study notes...</p>
    </div>
  );
  return (
    <div className="space-y-6 edsynapse-stagger font-sans">
      {notes.summary && (
        <div className="p-4 rounded-2xl bg-white/40 border border-white/60 italic text-foreground/80 shadow-sm">
          <Markdown>{notes.summary}</Markdown>
        </div>
      )}
      <div className="space-y-6">
        {notes.sections.map((sec, i) => (
          <div key={i} className="space-y-3">
            <h2 className="text-lg font-bold text-foreground font-display tracking-tight border-b border-black/5 pb-2">
              {sec.heading}
            </h2>
            <Markdown>{sec.content}</Markdown>
          </div>
        ))}
      </div>
      {notes.key_concepts && notes.key_concepts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-4 border-t border-black/5">
          {notes.key_concepts.map((c, i) => (
            <span
              key={i}
              className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[10px] font-bold text-primary"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Flashcards View ──────────────────────────────────────────────────────────
function FlashcardsView({ cards, loading }: { cards: Flashcard[]; loading: boolean }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setFlipped((p) => {
      const s = new Set(p);
      if (s.has(i)) s.delete(i);
      else s.add(i);
      return s;
    });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-center edsynapse-stagger">
      <div className="mb-4 w-10 h-10 animate-spin rounded-full border-2 border-[#8b5cf6]/20 border-t-[#8b5cf6]" />
      <p className="text-xs font-semibold text-muted-foreground">Creating flashcards...</p>
    </div>
  );
  if (!cards.length) return (
    <p className="text-xs text-muted-foreground py-12 text-center">
      No flashcards created yet. Ask the tutor to generate study guides.
    </p>
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 edsynapse-stagger">
      {cards.map((card, i) => (
        <div
          key={i}
          role="button"
          tabIndex={0}
          onClick={() => toggle(i)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(i)}
          className="group relative h-40 w-full cursor-pointer [perspective:1000px] text-left outline-none"
        >
          <div
            className={cn(
              "absolute inset-0 w-full h-full transition-transform duration-500 [transform-style:preserve-3d]",
              flipped.has(i) ? "[transform:rotateY(180deg)]" : ""
            )}
          >
            {/* Front */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-white/75 bg-white/50 backdrop-blur-md p-5 text-center [backface-visibility:hidden] shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground mb-2">Question</span>
              <Markdown className="font-bold text-xs text-foreground leading-relaxed">{card.front}</Markdown>
              <span className="absolute bottom-3 text-[9px] font-bold text-[#8b5cf6]">Tap to flip</span>
            </div>
            {/* Back */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 p-5 text-center [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-sm">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#8b5cf6] mb-2 font-display">Explanation</span>
              <Markdown className="text-xs font-medium text-foreground leading-relaxed">{card.back}</Markdown>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mind Map View ────────────────────────────────────────────────────────────
const MIND_MAP_COLORS = ["#f59e0b", "#10b981", "#8b5cf6", "#0066cc", "#ef4444", "#06b6d4"];

function MindMapView({ notes, topic, loading }: { notes: SmartNotes | null; topic: string; loading: boolean }) {
  if (loading || !notes) return (
    <div className="flex flex-col items-center justify-center py-20 text-center edsynapse-stagger">
      <div className="mb-4 w-10 h-10 animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-500" />
      <p className="text-xs font-semibold text-muted-foreground">Mapping out key concepts...</p>
    </div>
  );

  const nodes = notes.key_concepts?.length
    ? notes.key_concepts
    : notes.sections.map((s) => s.heading);

  if (!nodes.length) return (
    <p className="text-xs text-muted-foreground py-12 text-center">
      No concepts available yet. Ask the tutor to generate study guides for this topic.
    </p>
  );

  return (
    <div className="space-y-4 edsynapse-stagger">
      <div className="flex items-center gap-2">
        <Network className="w-5 h-5 text-amber-500" />
        <h3 className="text-base font-bold text-foreground font-display">Mind Map Outline</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Explore core concepts of <span className="font-semibold text-foreground">{topic}</span>.
      </p>
      <div className="p-8 border border-white/70 bg-white/40 rounded-3xl backdrop-blur-md flex flex-col items-center gap-4">
        <span className="p-3 bg-primary text-white text-xs font-bold rounded-2xl shadow-md">{topic}</span>
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-start justify-center">
          {nodes.map((n, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
              <span
                className="p-3 text-white text-xs font-bold rounded-2xl shadow-md text-center"
                style={{ backgroundColor: MIND_MAP_COLORS[i % MIND_MAP_COLORS.length] }}
              >
                {n}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Interactive Comprehension Check ─────────────────────────────────────────
function CheckPopup({
  check,
  onDismiss,
}: {
  check: { question: string; hint: string };
  onDismiss: (answer: string) => void;
}) {
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      onDismiss(response);
    }, 1500);
  };

  return (
    <div className="my-4 rounded-2xl border border-amber-200 bg-amber-500/5 p-4 space-y-3 shadow-inner edsynapse-stagger">
      <div className="flex items-center gap-1.5 text-amber-700">
        <Zap className="w-4 h-4 text-amber-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider">AI Tutor Comprehension Check</span>
      </div>
      <p className="text-xs font-bold text-foreground leading-relaxed font-display">{check.question}</p>
      {check.hint && <p className="text-[10px] text-muted-foreground">Hint: {check.hint}</p>}

      {!submitted ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Type your brief answer..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="flex-1 p-2 rounded-xl border border-amber-200 bg-white/80 focus:border-amber-400 focus:bg-white text-xs outline-none"
          />
          <button
            type="submit"
            disabled={!response.trim()}
            className="px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            Submit
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Evaluating response...</span>
        </div>
      )}
    </div>
  );
}

// ── Generic streaming conversation panel (used by Chat + Discussion tabs) ─────
type ChatMsg = { role: "user" | "ai"; text: string };

type ConvThread = { topic: string; title: string; updatedAt: string; preview: string };

function ConversationPanel({
  surface,
  courseId,
  title,
  subtitle,
  welcome,
  accent,
  emptyHint,
  suggestions,
  newLabel,
  stream,
}: {
  surface: "chat" | "tutor" | "socratic" | "discussion";
  courseId: string | null;
  title: string;
  subtitle: string;
  welcome: string;
  accent: string;
  emptyHint: string;
  suggestions: string[];
  newLabel: string;
  stream: (
    topicKey: string,
    message: string,
    history: { role: "user" | "assistant"; content: string }[],
    signal: AbortSignal,
  ) => AsyncGenerator<{ type: string; [k: string]: unknown }>;
}) {
  const [threads, setThreads] = useState<ConvThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: "ai", text: welcome }]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  // Single delete confirmation.
  const [deleteTarget, setDeleteTarget] = useState<ConvThread | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Drag-resizable thread rail; width persisted per surface (clamped 180–480px).
  const rail = useResizableSidebar({ storageKey: `es-rail-w-${surface}`, defaultWidth: 240, min: 180, max: 480 });

  // Grow the textarea with its content, up to a cap.
  const autosize = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);
  const abortRef = useRef<AbortController | null>(null);

  const defaultTitle =
    surface === "tutor"
      ? "New tutor chat"
      : surface === "socratic"
        ? "New Socratic chat"
        : surface === "chat"
          ? "New chat"
          : "New discussion";

  const mapStored = (m: { role: "user" | "assistant"; content: string }): ChatMsg => ({
    role: m.role === "assistant" ? "ai" : "user",
    text: m.content,
  });

  // Load the thread list for this course+surface; open the most recent.
  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setThreadsLoading(true);
    studentApi
      .listConversations(courseId, surface)
      .then(({ threads }) => {
        if (cancelled) return;
        setThreads(threads);
        if (threads.length > 0) {
          const first = threads[0].topic;
          setActiveTopic(first);
          studentApi
            .getTutorHistory(courseId, first)
            .then(({ messages }) => {
              if (!cancelled) setMessages(messages.length ? messages.map(mapStored) : [{ role: "ai", text: welcome }]);
            })
            .catch((err) => {
              console.error("[ConversationPanel] Initial history load failed:", err);
              if (!cancelled) setMessages([{ role: "ai", text: welcome }]);
            });
        } else {
          setActiveTopic(null);
          setMessages([{ role: "ai", text: welcome }]);
        }
      })
      .catch((err) => {
        console.error("[ConversationPanel] Failed to list conversations:", err);
        if (!cancelled) setThreads([]);
      })
      .finally(() => !cancelled && setThreadsLoading(false));
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, surface]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, generating]);

  const selectThread = useCallback(
    async (topic: string, force = false) => {
      if (!force && topic === activeTopic && messages.length > 1) return;
      if (!courseId) return;
      abortRef.current?.abort();
      setActiveTopic(topic);
      setMessages([{ role: "ai", text: welcome }]);
      try {
        const { messages: historyMsgs } = await studentApi.getTutorHistory(courseId, topic);
        if (historyMsgs.length) {
          setMessages(historyMsgs.map(mapStored));
        } else {
          setMessages([{ role: "ai", text: welcome }]);
        }
      } catch (err) {
        console.error("[ConversationPanel] Failed to load tutor history:", err);
      }
    },
    [activeTopic, messages.length, courseId, welcome],
  );

  const newThread = useCallback(async () => {
    if (!courseId) return;
    abortRef.current?.abort();
    try {
      const { thread } = await studentApi.createConversation(courseId, surface);
      setThreads((prev) => [thread, ...prev]);
      setActiveTopic(thread.topic);
      setMessages([{ role: "ai", text: welcome }]);
    } catch {
      /* ignore */
    }
  }, [courseId, surface, welcome]);

  const deleteThread = useCallback(
    async (topic: string) => {
      if (!courseId) return;
      try {
        await studentApi.deleteConversation(courseId, topic);
      } catch {
        /* remove locally regardless */
      }
      setThreads((prev) => {
        const next = prev.filter((t) => t.topic !== topic);
        if (topic === activeTopic) {
          if (next.length > 0) {
            selectThread(next[0].topic);
          } else {
            setActiveTopic(null);
            setMessages([{ role: "ai", text: welcome }]);
          }
        }
        return next;
      });
    },
    [courseId, activeTopic, selectThread, welcome],
  );

  const saveRename = useCallback(
    async (topic: string) => {
      const title = editDraft.trim();
      setEditingTopic(null);
      if (!courseId || !title) return;
      setThreads((prev) => prev.map((t) => (t.topic === topic ? { ...t, title } : t)));
      try {
        await studentApi.renameConversation(courseId, topic, title);
      } catch {
        /* ignore */
      }
    },
    [courseId, editDraft],
  );

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || generating || !courseId) return;
      setInput("");

      // Lazily create a thread on the first message if none is active.
      let topic = activeTopic;
      const wasFirst = !topic || (messages.length === 1 && messages[0]?.role === "ai");
      if (!topic) {
        try {
          const { thread } = await studentApi.createConversation(courseId, surface);
          topic = thread.topic;
          setActiveTopic(topic);
          setThreads((prev) => [thread, ...prev]);
        } catch {
          setMessages((prev) => [...prev, { role: "ai", text: "Couldn't start a new conversation. Please try again." }]);
          return;
        }
      }

      const history = messages
        .filter((m) => m.text)
        .map((m) => ({ role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user", content: m.text }));
      setMessages((prev) => [...prev, { role: "user", text: msg }]);
      setGenerating(true);
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        for await (const event of stream(topic!, msg, history, ctrl.signal)) {
          if (event.type === "delta") {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "ai") {
                return [...prev.slice(0, -1), { role: "ai", text: last.text + (event.text as string) }];
              }
              return [...prev, { role: "ai", text: event.text as string }];
            });
          } else if (event.type === "done") {
            break;
          } else if (event.type === "error") {
            setMessages((prev) => [...prev, { role: "ai", text: `Error: ${event.message}` }]);
            break;
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setMessages((prev) => [...prev, { role: "ai", text: "Sorry, I couldn't reach the assistant. Please try again." }]);
        }
      } finally {
        setGenerating(false);
      }

      // Auto-title an untouched thread from its first message; bump it to the top.
      const derived = msg.length > 42 ? `${msg.slice(0, 42)}…` : msg;
      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.topic === topic);
        if (idx === -1) return prev;
        const t = prev[idx];
        const updated: ConvThread = {
          ...t,
          title: wasFirst && (t.title === defaultTitle || !t.title) ? derived : t.title,
          preview: msg,
          updatedAt: new Date().toISOString(),
        };
        const next = [...prev];
        next.splice(idx, 1);
        return [updated, ...next];
      });
      if (wasFirst && courseId && topic) {
        studentApi.renameConversation(courseId, topic, derived).catch(() => {});
      }
    },
    [input, messages, generating, courseId, activeTopic, surface, stream, defaultTitle],
  );

  // The "welcome" hero shows only before the learner has said anything.
  const isWelcome = messages.length === 1 && messages[0]?.role === "ai" && !generating;

  return (
    <div className="flex flex-1 min-w-0 min-h-0">
      {/* ── Thread rail (drag-resizable) ────────────────────── */}
      <aside
        style={{ width: rail.width }}
        className="relative hidden md:flex shrink-0 flex-col border-r border-white/50 bg-white/35 backdrop-blur-md"
      >
        {/* Drag handle on the right edge */}
        <div
          onMouseDown={rail.onMouseDown}
          title="Drag to resize"
          className="absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize transition-colors hover:bg-primary/25 active:bg-primary/40"
        />
        <div className="p-3 border-b border-white/50">
          <button
            onClick={newThread}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:opacity-95 active:scale-[0.98]"
            style={{ backgroundColor: accent }}
          >
            <Plus className="w-4 h-4" />
            {newLabel}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto chat-scroll p-2 space-y-1">
          {threadsLoading ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
          ) : threads.length === 0 ? (
            <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
              No saved {surface === "tutor" ? "tutor chats" : surface === "socratic" ? "Socratic chats" : surface === "chat" ? "chats" : "discussions"} yet. Start one above.
            </p>
          ) : (
            threads.map((t) => {
              const active = t.topic === activeTopic;
              return (
                <div
                  key={t.topic}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectThread(t.topic)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectThread(t.topic);
                    }
                  }}
                  className={cn(
                    "group flex items-center gap-1 rounded-xl px-2.5 py-2 transition-all cursor-pointer border outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active
                      ? "bg-white shadow-sm border-primary/30 ring-1 ring-primary/15"
                      : "border-transparent hover:bg-white hover:border-primary/20 hover:shadow-sm",
                  )}
                >
                  {editingTopic === t.topic ? (
                    <input
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") saveRename(t.topic);
                        if (e.key === "Escape") setEditingTopic(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => saveRename(t.topic)}
                      className="flex-1 min-w-0 rounded-lg border border-primary/20 bg-white px-2 py-1 text-xs font-semibold text-foreground outline-none"
                    />
                  ) : (
                    <div className="flex-1 min-w-0 text-left">
                      <p className={cn("truncate text-xs font-bold", active ? "text-foreground" : "text-foreground/80")}>
                        {t.title}
                      </p>
                      {t.preview && <p className="truncate text-[10px] text-muted-foreground">{t.preview}</p>}
                    </div>
                  )}
                  {editingTopic === t.topic ? (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        saveRename(t.topic);
                      }}
                      title="Save name"
                      className="shrink-0 rounded-lg p-1 text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div
                      className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTopic(t.topic);
                          setEditDraft(t.title);
                        }}
                        title="Rename"
                        className="rounded-lg p-1 text-muted-foreground hover:bg-white hover:text-foreground"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(t);
                        }}
                        title="Delete"
                        className="rounded-lg p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Conversation ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
      <div className="flex items-center justify-between border-b border-white/40 bg-white/40 backdrop-blur-md px-6 py-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="flex w-8 h-8 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: accent }}
          >
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground font-display leading-tight">{title}</p>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 chat-scroll">
        <div className="mx-auto w-full max-w-none">
          {isWelcome ? (
            /* Minimal starter — just suggested topics; no logo/title/welcome copy
               (the panel header already shows the title + subtitle). */
            <div className="flex flex-col items-center pt-6 edsynapse-stagger">
              {suggestions.length > 0 && (
                <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="group flex items-center gap-3 rounded-2xl border border-white/70 bg-white/50 p-3.5 text-left backdrop-blur-sm shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white hover:shadow-md active:scale-[0.98]"
                    >
                      <div
                        className="flex w-7 h-7 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: accent }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className="flex-1 text-xs font-semibold text-foreground">{s}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m, i) => (
                <div key={i} className={cn("group flex gap-3", m.role === "user" && "justify-end")}>
                  {m.role === "ai" && (
                    <div className="flex w-7 h-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/10 bg-white shadow-sm">
                      <Image src="/logo.png" alt="EdSynapse" width={20} height={20} className="object-contain" />
                    </div>
                  )}
                  <div className={cn("flex max-w-[72%] flex-col gap-1", m.role === "user" && "items-end")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm font-sans",
                        m.role === "ai"
                          ? "bg-white border border-white/60 text-foreground"
                          : "bg-primary text-white whitespace-pre-wrap",
                      )}
                    >
                      {m.role === "ai" ? <Markdown>{m.text}</Markdown> : m.text}
                    </div>
                    {m.text && (
                      <CopyButton text={m.text} className="opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                </div>
              ))}

              {generating && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="flex w-7 h-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/10 bg-white shadow-sm">
                    <Image src="/logo.png" alt="EdSynapse" width={20} height={20} className="object-contain" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl border border-white/60 bg-white px-3 py-2.5 shadow-sm">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="w-1.5 h-1.5 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: `${j * 120}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="mx-auto w-full max-w-none">
          <div className="flex items-end gap-2 rounded-2xl border border-primary/15 bg-white p-2 shadow-lg shadow-primary/10">
            <textarea
              ref={taRef}
              value={input}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value);
                autosize();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                  requestAnimationFrame(autosize);
                }
              }}
              placeholder={emptyHint}
              className="chat-scroll flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground font-sans"
            />
            <button
              onClick={() => {
                send();
                requestAnimationFrame(autosize);
              }}
              disabled={!input.trim() || generating}
              className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl text-white hover:opacity-95 disabled:opacity-40 transition-all"
              style={{ backgroundColor: accent }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            <span className="font-semibold">Enter</span> to send · <span className="font-semibold">Shift + Enter</span> for a new line
          </p>
        </div>
      </div>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl edsynapse-stagger" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex w-11 h-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground font-display">Are you absolutely sure?</h3>
                <p className="text-xs text-muted-foreground">This can&apos;t be undone.</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-foreground/80">
              Delete <span className="font-semibold">&ldquo;{deleteTarget.title}&rdquo;</span> and its full message history
              permanently?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const topic = deleteTarget.topic;
                  setDeleteTarget(null);
                  deleteThread(topic);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-red-700 active:scale-[0.97]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Course tab: all uploaded source material, with text preview ───────────────
function CoursePanel({ course, courseColor }: { course: Course | null; courseColor: string }) {
  const [sources, setSources] = useState<{ id: string; title: string; type: string; lesson_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ title: string; content: string } | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const courseId = course?.id ?? null;
  // Material can be uploaded straight from this tab for personal self-study
  // spaces (the student owns them). Class material is managed by the teacher.
  const canUpload = course?.kind === "self_study";

  const reload = useCallback(() => {
    if (!courseId) return;
    setLoading(true);
    studentApi
      .listSources(courseId)
      .then(({ sources }) => setSources(sources))
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Upload one or more files directly to the course (no lesson). They're stored
  // in their original format AND embedded for RAG so they ground every chatbot.
  const handleUpload = useCallback(
    async (fileList: FileList | null, input: HTMLInputElement | null) => {
      if (!courseId || !fileList || fileList.length === 0) return;
      setUploading(true);
      setUploadError("");
      try {
        const form = new FormData();
        Array.from(fileList).forEach((f) => form.append("files", f));
        await studentApi.addSource(courseId, form);
        reload();
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to upload material.");
      } finally {
        setUploading(false);
        if (input) input.value = "";
      }
    },
    [courseId, reload],
  );

  const lessonTitle = useCallback(
    (lessonId: string | null) => {
      if (!lessonId) return "Unfiled material";
      const l = course?.lessons.find((x) => x.id === lessonId);
      return l ? `Lesson ${l.lesson}: ${l.title}` : "Lesson material";
    },
    [course],
  );

  // Colour-code the file icon by type so the list scans quickly.
  const fileAccent = (type: string) =>
    type === "pdf" ? "#EF4444" : type === "docx" ? "#2563EB" : type === "xlsx" ? "#16A34A" : "#64748B";

  const openPreview = useCallback(
    async (id: string) => {
      if (!courseId) return;
      setPreviewing(id);
      try {
        const { source } = await studentApi.getSource(courseId, id);
        setPreview({ title: source.title, content: source.content || "(No extracted text is stored for this file.)" });
      } catch {
        setPreview({ title: "Preview unavailable", content: "Could not load this source." });
      } finally {
        setPreviewing(null);
      }
    },
    [courseId],
  );

  // Group sources by lesson, preserving lesson order.
  const groups = useMemo(() => {
    const map = new Map<string | null, typeof sources>();
    for (const s of sources) {
      const arr = map.get(s.lesson_id) ?? [];
      arr.push(s);
      map.set(s.lesson_id, arr);
    }
    return [...map.entries()];
  }, [sources]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex w-11 h-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-blue-600 text-white shadow-lg shadow-primary/20">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground font-display tracking-tight leading-tight">Course Material</h2>
              <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                Files for <span className="font-semibold text-foreground">{course?.name ?? "this course"}</span>, kept in their
                original format. They ground the tutor, quizzes and discussion.
              </p>
              {!loading && sources.length > 0 && (
                <p className="pt-0.5 text-[11px] font-semibold text-muted-foreground">
                  {sources.length} file{sources.length === 1 ? "" : "s"} · embedded for retrieval
                </p>
              )}
            </div>
          </div>
          {canUpload && (
            <label
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98]",
                uploading ? "opacity-70" : "hover:shadow-xl hover:shadow-primary/25",
              )}
            >
              {uploading ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? "Uploading…" : "Upload material"}
              <input
                type="file"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleUpload(e.target.files, e.target)}
              />
            </label>
          )}
        </div>

        {uploadError && (
          <p className="rounded-2xl border border-rose-200 bg-rose-500/5 px-4 py-2.5 text-xs font-semibold text-rose-600">
            {uploadError}
          </p>
        )}

        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : sources.length === 0 ? (
          canUpload ? (
            <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-primary/20 bg-white/30 p-12 text-center transition-all hover:border-primary/40 hover:bg-white/50">
              <div className="flex w-12 h-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground font-display">Add your first file</h3>
                <p className="text-xs text-muted-foreground">
                  Drop in a PDF, DOCX, XLSX or notes — or add files per-lesson from the <span className="font-bold">Learning</span> tab.
                </p>
              </div>
              <input type="file" multiple className="hidden" disabled={uploading} onChange={(e) => handleUpload(e.target.files, e.target)} />
            </label>
          ) : (
            <div className="liquid-panel rounded-3xl p-12 text-center space-y-2">
              <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground" />
              <h3 className="text-base font-bold text-foreground font-display">No material yet</h3>
              <p className="text-xs text-muted-foreground">Material added by your teacher will appear here.</p>
            </div>
          )
        ) : (
          <div className="space-y-5 edsynapse-stagger">
            {groups.map(([lessonId, items]) => (
              <div key={lessonId ?? "unfiled"} className="liquid-panel rounded-3xl overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-3 border-b border-white/50 bg-white/40 px-5 py-3.5">
                  <div
                    className={cn(
                      "flex w-8 h-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
                      !lessonId && "opacity-70",
                    )}
                    style={{ backgroundColor: lessonId ? courseColor : "#94A3B8" }}
                  >
                    {lessonId ? <Layers className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                  </div>
                  <p className="flex-1 min-w-0 truncate text-sm font-bold text-foreground font-display">{lessonTitle(lessonId)}</p>
                  <span className="shrink-0 rounded-full bg-black/5 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {items.length} file{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                {/* Files */}
                <div className="divide-y divide-white/50">
                  {items.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/50">
                      <div
                        className="flex w-10 h-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: fileAccent(s.type) }}
                      >
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">{s.title}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.type}</p>
                      </div>
                      <button
                        onClick={() => openPreview(s.id)}
                        disabled={previewing === s.id}
                        title="Preview extracted text"
                        className="flex items-center gap-1.5 rounded-xl border border-primary/15 bg-white/70 px-3 py-2 text-xs font-bold text-primary transition-all hover:bg-white hover:shadow-sm active:scale-[0.97] disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{previewing === s.id ? "Loading…" : "Preview"}</span>
                      </button>
                      {courseId && (
                        <a
                          href={studentApi.sourceDownloadUrl(courseId, s.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-white hover:text-foreground hover:shadow-sm active:scale-[0.97]"
                          title="Download original file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setPreview(null)}>
          <div
            className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl bg-white p-6 shadow-2xl edsynapse-stagger"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-3">
              <h3 className="text-sm font-bold text-foreground font-display truncate">{preview.title}</h3>
              <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground/80 font-sans scrollbar-hide">
              {preview.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline course-wide diagnostic test (replaces "Select a concept") ──────────
function DiagnosticPanel({
  courseId,
  topics,
  strengthsGaps,
  isOpen,
  onClose,
  phase,
  setPhase,
  quiz,
  setQuiz,
  answers,
  setAnswers,
  result,
  setResult,
  error,
  setError,
}: {
  courseId: string;
  topics: string[];
  strengthsGaps: StrengthsGaps | null;
  isOpen: boolean;
  onClose: () => void;
  phase: "intro" | "loading" | "quiz" | "grading" | "result" | "error" | "resume";
  setPhase: React.Dispatch<React.SetStateAction<"intro" | "loading" | "quiz" | "grading" | "result" | "error" | "resume">>;
  quiz: DiagnosticQuiz | null;
  setQuiz: React.Dispatch<React.SetStateAction<DiagnosticQuiz | null>>;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  result: StrengthsGaps | null;
  setResult: React.Dispatch<React.SetStateAction<StrengthsGaps | null>>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
}) {
  // Reset or set to resume phase when diagnostic panel is opened/closed
  useEffect(() => {
    if (isOpen) {
      if (quiz && (phase === "quiz" || phase === "resume")) {
        setPhase("resume");
      } else if (phase === "result" || phase === "error") {
        setQuiz(null);
        setAnswers({});
        setResult(null);
        setError("");
        setPhase("intro");
      }
    }
  }, [isOpen]);

  // Build a weakness-first ranked topic list.
  // Priority: needs_improvement → moderate → untested → strong.
  // Cap at 8 topics so the quiz stays focused (2 questions per topic = 16 Qs max).
  const MAX_TOPICS = 8;
  const levelRank: Record<string, number> = { needs_improvement: 0, moderate: 1, strong: 3 };
  const knownLevels = new Map<string, string>((strengthsGaps?.topics ?? []).map((t) => [t.topic, t.level]));
  const targetTopics = (() => {
    const ranked = topics
      .map((t) => ({ topic: t, rank: knownLevels.has(t) ? levelRank[knownLevels.get(t)!] ?? 3 : 2 }))
      .sort((a, b) => a.rank - b.rank)
      .map((x) => x.topic);
    return ranked.slice(0, MAX_TOPICS);
  })();

  const weakTopics    = targetTopics.filter((t) => knownLevels.get(t) === "needs_improvement");
  const moderateTopics = targetTopics.filter((t) => knownLevels.get(t) === "moderate");
  const untestedTopics = targetTopics.filter((t) => !knownLevels.has(t));
  const strongTopics  = targetTopics.filter((t) => knownLevels.get(t) === "strong");

  const hasHistory = knownLevels.size > 0;

  const start = useCallback(async () => {
    if (targetTopics.length === 0) return;
    setPhase("loading");
    try {
      // Pass the weak topics so the server can generate harder, gap-exposing
      // questions for those areas rather than generic introductory ones.
      const q = await studentApi.diagnoseQuiz(courseId, targetTopics, weakTopics);
      setQuiz(q);
      setPhase("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build the diagnostic.");
      setPhase("error");
    }
  }, [courseId, targetTopics, weakTopics, setPhase, setQuiz, setError]);

  const resetAndStart = useCallback(async () => {
    setQuiz(null);
    setAnswers({});
    setError("");
    setPhase("loading");
    try {
      const q = await studentApi.diagnoseQuiz(courseId, targetTopics, weakTopics);
      setQuiz(q);
      setPhase("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build the diagnostic.");
      setPhase("error");
    }
  }, [courseId, targetTopics, weakTopics, setQuiz, setAnswers, setError, setPhase]);

  const submit = useCallback(async () => {
    if (!quiz) return;
    setPhase("grading");
    try {
      const formatted = quiz.questions.map((q) => {
        const raw = answers[q.id] ?? "";
        const idx = parseInt(raw, 10);
        const label = !isNaN(idx) && q.choices[idx] ? q.choices[idx].label : raw;
        return { question_id: q.id, selected_label: label };
      });
      const map = await studentApi.diagnoseEvaluate(courseId, targetTopics, quiz.questions, formatted);
      setResult(map);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't grade your diagnostic.");
      setPhase("error");
    }
  }, [quiz, answers, courseId, targetTopics, setPhase, setResult, setError]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex w-9 h-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-blue-600 text-white shadow">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground font-display tracking-tight leading-tight">Diagnostic Test</h2>
              <p className="text-[11px] text-muted-foreground">
                {hasHistory ? "Targets your weakest topics first." : "Maps your mastery across this course's topics."}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            Close
          </button>
        </div>

        {phase === "intro" && (
          <div className="liquid-panel rounded-3xl p-6 space-y-5 edsynapse-stagger">
            {topics.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                This course has no topics yet. Add lessons and material first, then run a diagnostic.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground font-display">
                    {hasHistory ? "Targeting your weak areas" : "Ready to find your starting point?"}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {hasHistory
                      ? `A focused quiz on ${targetTopics.length} topic${targetTopics.length === 1 ? "" : "s"} — prioritising the areas where you need the most work. Your answers will update your strengths & gaps.`
                      : `A short grounded quiz across ${targetTopics.length} topic${targetTopics.length === 1 ? "" : "s"}. Your answers update your strengths & gaps so the tutor knows where to focus.`
                    }
                  </p>
                </div>

                {/* Color-coded topic badges */}
                <div className="space-y-2">
                  {weakTopics.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-rose-600">Needs work — top priority</p>
                      <div className="flex flex-wrap gap-1.5">
                        {weakTopics.map((t) => (
                          <span key={t} className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {moderateTopics.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-amber-600">Developing — needs reinforcement</p>
                      <div className="flex flex-wrap gap-1.5">
                        {moderateTopics.map((t) => (
                          <span key={t} className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {untestedTopics.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Untested — included to complete your profile</p>
                      <div className="flex flex-wrap gap-1.5">
                        {untestedTopics.map((t) => (
                          <span key={t} className="flex items-center gap-1 rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[10px] font-bold text-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {strongTopics.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-600">Strong — included for verification</p>
                      <div className="flex flex-wrap gap-1.5">
                        {strongTopics.map((t) => (
                          <span key={t} className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {topics.length > MAX_TOPICS && (
                  <p className="text-[10px] text-muted-foreground">
                    {topics.length - MAX_TOPICS} topic{topics.length - MAX_TOPICS === 1 ? "" : "s"} skipped this round (already strong or will be covered next time).
                  </p>
                )}

                <button
                  onClick={start}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/95 active:scale-[0.98]"
                >
                  <Zap className="w-4 h-4" />
                  {hasHistory ? "Start focused diagnostic" : "Start diagnostic"}
                </button>
              </>
            )}
          </div>
        )}

        {phase === "resume" && (
          <div className="liquid-panel rounded-3xl p-6 space-y-6 text-center edsynapse-stagger">
            <div className="mx-auto flex w-12 h-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground font-display">
                Diagnostic Quiz in Progress
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                You have an active, incomplete diagnostic test. You can continue where you left off or ask to generate a fresh one.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => setPhase("quiz")}
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/95 active:scale-[0.98]"
              >
                <Play className="w-4 h-4" />
                Continue with that quiz
              </button>
              <button
                onClick={resetAndStart}
                className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-white px-5 py-3 text-xs font-bold text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                Re-generate diagnostic
              </button>
            </div>
          </div>
        )}

        {(phase === "loading" || phase === "grading") && (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 edsynapse-stagger">
            <div className="w-10 h-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className="text-sm font-bold">{phase === "loading" ? "Assembling your diagnostic…" : "Grading your answers…"}</p>
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-3xl border border-rose-200 bg-rose-500/5 p-6 text-center space-y-4 edsynapse-stagger">
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <button onClick={() => setPhase("intro")} className="text-xs font-bold text-primary hover:underline">
              Try again
            </button>
          </div>
        )}

        {phase === "quiz" && quiz && (
          <div className="space-y-5 edsynapse-stagger">
            {quiz.questions.map((q, idx) => (
              <QuizCard
                key={q.id}
                index={idx}
                question={q.prompt}
                options={q.choices.map((c) => `${c.label}. ${c.text}`)}
                type="mcq"
                selectedAnswer={answers[q.id] ?? ""}
                onSelectAnswer={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                showResults={false}
              />
            ))}
            <button
              onClick={submit}
              disabled={!quiz.questions.every((q) => answers[q.id])}
              className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-bold text-white transition-all hover:bg-primary/95 disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              <Trophy className="w-4 h-4" />
              Submit diagnostic
            </button>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-5 edsynapse-stagger">
            <div className="liquid-panel rounded-3xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <h3 className="text-base font-bold text-foreground font-display">Diagnostic complete</h3>
              <p className="text-xs text-muted-foreground">
                Overall mastery: <span className="font-bold text-primary">{Math.round(result.overall_mastery)}%</span>. Your knowledge
                map has been updated.
              </p>
            </div>
            <div className="space-y-2">
              {result.topics.map((t) => (
                <div key={t.topic} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/45 p-3.5 shadow-sm">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0",
                      t.level === "strong" ? "bg-emerald-500" : t.level === "moderate" ? "bg-amber-500" : "bg-rose-500",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">{t.topic}</p>
                    {t.evidence && <p className="truncate text-[10px] text-muted-foreground">{t.evidence}</p>}
                  </div>
                  <span className="text-[10px] font-bold capitalize text-muted-foreground">{t.level.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-bold text-white transition-all hover:bg-primary/95 shadow-lg shadow-primary/20"
            >
              <ArrowRight className="w-4 h-4" />
              Back to study workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentClassPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const searchParams = useSearchParams();

  // Learning preferences come from the user's profile (set during onboarding / settings).
  const { user } = useAuth();
  const modality: "text" | "visual" | "audio" =
    user?.learningModality && user.learningModality !== "all" ? user.learningModality : "text";
  const pace: "methodical" | "deep" =
    user?.learningPace === "deep" || user?.learningPace === "methodical" ? user.learningPace : "methodical";

  const [activeMode, setActiveMode] = useState<Mode>("notes");
  // Top-level horizontal navbar: Course / Learning / Chat / Discussion.
  const [view, setView] = useState<ClassView>("learning");
  // Inline course-wide diagnostic (replaces the old "Select a concept" slot).
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  // Hoisted diagnostic test states to preserve progress across page/view switches
  const [diagnosticPhase, setDiagnosticPhase] = useState<"intro" | "loading" | "quiz" | "grading" | "result" | "error" | "resume">("intro");
  const [diagnosticQuiz, setDiagnosticQuiz] = useState<DiagnosticQuiz | null>(null);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<string, string>>({});
  const [diagnosticResult, setDiagnosticResult] = useState<StrengthsGaps | null>(null);
  const [diagnosticError, setDiagnosticError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [studyStarted, setStudyStarted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");

  // Whether the student has any material they can actually access (published
  // sources for a class; their own uploads for self-study). When false, the
  // tutor/discussion bots have nothing to ground on, so we hide the seeded
  // example prompts (they'd be untailored). null = not yet loaded.
  const [hasPublishedMaterial, setHasPublishedMaterial] = useState<boolean | null>(null);

  // Content state
  const [notes, setNotes] = useState<SmartNotes | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [podcast, setPodcast] = useState<{ script: string } | null>(null);
  const [podcastPlaying, setPodcastPlaying] = useState(false);

  // Browser text-to-speech for the podcast script — no extra backend cost.
  const stopPodcastPlayback = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setPodcastPlaying(false);
  }, []);

  const togglePodcastPlayback = useCallback(
    (script: string) => {
      if (typeof window === "undefined") return;
      if (podcastPlaying) {
        window.speechSynthesis.cancel();
        setPodcastPlaying(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.rate = 0.95;
      utterance.onend = () => setPodcastPlaying(false);
      utterance.onerror = () => setPodcastPlaying(false);
      window.speechSynthesis.speak(utterance);
      setPodcastPlaying(true);
    },
    [podcastPlaying],
  );

  // Stop playback on unmount or when switching topics/versions.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis.cancel();
    };
  }, []);
  const [notesLoading, setNotesLoading] = useState(false);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);

  // Versioned study materials — one version per regenerate-after-assessment cycle.
  const [materialVersions, setMaterialVersions] = useState<StudyMaterialVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  // True while a *new* revision is being generated in the background — the old
  // revisions stay viewable instead of blocking on a full-screen loader.
  const [regenerating, setRegenerating] = useState(false);
  // Mirror of selectedVersion readable inside async callbacks without stale closure.
  const selectedVersionRef = useRef<number | null>(null);
  useEffect(() => {
    selectedVersionRef.current = selectedVersion;
  }, [selectedVersion]);
  // The topic whose materials we're currently loading. Async results from a
  // previous topic are ignored so switching topics never shows the wrong
  // revisions bar (or hides the right one mid-load).
  const materialTopicRef = useRef<string>("");
  // In-flight generation promise per topic. Dedupes concurrent generation for
  // the same topic (the DB revision key can't take two parallel inserts) AND lets
  // a topic click reuse a background lesson-prefetch already running for it.
  const generatingTopicsRef = useRef<
    Map<string, Promise<{ latest: StudyMaterialVersion; versions: StudyMaterialVersion[] }>>
  >(new Map());

  // Generate + persist study material for one topic, deduped: if a generation for
  // this topic is already running (e.g. a background lesson prefetch), reuse that
  // promise instead of firing a second ~15s LLM run.
  const generateAndSave = useCallback((cid: string, topic: string) => {
    const inflight = generatingTopicsRef.current.get(topic);
    if (inflight) return inflight;
    const p = studentApi
      .getOrGenerateMaterials(cid, topic)
      .finally(() => generatingTopicsRef.current.delete(topic));
    generatingTopicsRef.current.set(topic, p);
    return p;
  }, []);

  // Drag-resizable lesson chat panel (right of the study material); width persisted.
  const chatPanel = useResizableSidebar({ storageKey: "es-lesson-chat-w", defaultWidth: 320, min: 280, max: 640, edge: "left" });

  // Drag-resizable left lesson sidebar (only while expanded); width persisted.
  const leftSidebar = useResizableSidebar({ storageKey: "es-lesson-sidebar-w", defaultWidth: 260, min: 200, max: 420 });

  const applyVersion = useCallback((v: StudyMaterialVersion, topic: string) => {
    setSelectedVersion(v.version);
    setNotes({ topic, summary: v.notes.summary, sections: v.notes.sections, key_concepts: v.notes.key_concepts, sources: [] });
    setFlashcards(v.flashcards);
    setPodcast(v.podcast);
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setPodcastPlaying(false);
  }, []);

  // Chat
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string; check?: { question: string; hint: string } }[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // The course loaded by code (real API). Students see published lessons only.
  const [course, setCourseData] = useState<Course | null>(null);
  const [loadError, setLoadError] = useState("");
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [addingLesson, setAddingLesson] = useState(false);
  const [uploadingLessonId, setUploadingLessonId] = useState<string | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [promptUploadLessonId, setPromptUploadLessonId] = useState<string | null>(null);

  // After uploading material, the student reviews/edits the extracted topics
  // before they're confirmed. Working set + the "add custom topic" inputs, keyed
  // by lesson id. A lesson with material but an empty outline is "pending review".
  const [reviewTopics, setReviewTopics] = useState<Record<string, string[]>>({});
  const [newTopicInput, setNewTopicInput] = useState<Record<string, string>>({});
  const [confirmingLessonId, setConfirmingLessonId] = useState<string | null>(null);

  const reloadCourse = useCallback(async () => {
    try {
      const { course } = await studentApi.getCourseByCode(code);
      setCourseData(course);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load this course.");
    }
  }, [code]);

  useEffect(() => {
    reloadCourse();
  }, [reloadCourse]);

  const isSelfStudy = course?.kind === "self_study";
  const courseId = course?.id ?? null;
  const lessons: CourseLesson[] = course?.lessons.filter((w) => w.published) ?? [];
  const courseColor = course?.color ?? (isSelfStudy ? "#10b981" : "#0066cc");
  const allTopics = lessons.flatMap((l) => l.outline);

  // listSources returns only material the student can access — published sources
  // for an enrolled class student (the API filters by publish state).
  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    studentApi
      .listSources(courseId)
      .then(({ sources }) => { if (!cancelled) setHasPublishedMaterial(sources.length > 0); })
      .catch(() => { if (!cancelled) setHasPublishedMaterial(false); });
    return () => { cancelled = true; };
  }, [courseId]);

  // The student's per-topic strengths & gaps, built from quiz/assessment
  // performance. Empty until they've attempted something — which is exactly what
  // lets the Socratic AI suggestions stay generic at first and target weak
  // topics once there's evidence.
  const [strengthsGaps, setStrengthsGaps] = useState<StrengthsGaps | null>(null);
  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    studentApi
      .getStrengthsGaps(courseId)
      .then((map) => { if (!cancelled) setStrengthsGaps(map); })
      .catch(() => { if (!cancelled) setStrengthsGaps(null); });
    return () => { cancelled = true; };
  }, [courseId]);

  // Periodic background polling for classroom view (every 5 seconds)
  useEffect(() => {
    if (!courseId) return;
    const interval = setInterval(async () => {
      try {
        if (!diagnosticOpen && !generating && !notesLoading && !flashcardsLoading) {
          // 1. Reload course
          const { course: updatedCourse } = await studentApi.getCourseByCode(code);
          setCourseData((prev) => {
            if (!prev) return updatedCourse;
            const changed = prev.name !== updatedCourse.name || 
              prev.lessons.length !== updatedCourse.lessons.length ||
              prev.lessons.some((l, i) => !updatedCourse.lessons[i] || l.published !== updatedCourse.lessons[i].published || l.outline.length !== updatedCourse.lessons[i].outline.length);
            return changed ? updatedCourse : prev;
          });

          // 2. Reload strengths-gaps
          const map = await studentApi.getStrengthsGaps(courseId);
          setStrengthsGaps(map);
        }
      } catch (err) {
        console.warn("[StudentClassPage] Background auto-refresh failed:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [courseId, code, diagnosticOpen, generating, notesLoading, flashcardsLoading]);

  // Socratic AI starter prompts: generic topics at first, then the student's
  // weakest topics (needs_improvement → moderate → strong) once we have quiz
  // performance to rank by. Falls back to the first topics when there's no data.
  const chatSuggestions = (() => {
    if (!hasPublishedMaterial) return [];
    const rank = { needs_improvement: 0, moderate: 1, strong: 2 } as const;
    const ranked = (strengthsGaps?.topics ?? [])
      .filter((t) => allTopics.includes(t.topic))
      .sort((a, b) => rank[a.level] - rank[b.level])
      .map((t) => t.topic);
    const ordered =
      ranked.length > 0 ? [...ranked, ...allTopics.filter((t) => !ranked.includes(t))] : allTopics;
    return ordered.slice(0, 4).map((t) => `Help me understand ${t}`);
  })();

  // Self-study: add a lesson via the API, then prompt for its source material.
  const addLesson = useCallback(async () => {
    const title = newLessonTitle.trim();
    if (!courseId || !title || addingLesson) return;
    setAddingLesson(true);
    try {
      const { course, lessonId } = await studentApi.addSelfStudyLesson(courseId, title, []);
      setCourseData(course);
      setNewLessonTitle("");
      setPromptUploadLessonId(lessonId);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to add lesson.");
    } finally {
      setAddingLesson(false);
    }
  }, [courseId, newLessonTitle, addingLesson]);

  // Self-study: upload material to a lesson. The backend extracts candidate
  // topics but does NOT commit them (applyTopics=false) — the student reviews and
  // edits them, then confirms (confirmTopics) to generate study material.
  const handleFilesUploaded = useCallback(
    async (lessonId: string, fileList: FileList | null, input: HTMLInputElement | null) => {
      if (!courseId || !fileList || fileList.length === 0) return;
      setUploadingLessonId(lessonId);
      try {
        const form = new FormData();
        Array.from(fileList).forEach((f) => form.append("files", f));
        form.append("lessonId", lessonId);
        form.append("extractTopics", "true");
        form.append("applyTopics", "false");
        const { topics } = await studentApi.addSource(courseId, form);
        await reloadCourse();
        setReviewTopics((prev) => ({ ...prev, [lessonId]: topics }));
        setPromptUploadLessonId((current) => (current === lessonId ? null : current));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to upload material.");
      } finally {
        setUploadingLessonId(null);
        if (input) input.value = "";
      }
    },
    [courseId, reloadCourse],
  );

  // The working topic list for a lesson under review: explicit edits if present,
  // otherwise the freshly-extracted candidates.
  const topicsFor = useCallback(
    (lesson: CourseLesson) => reviewTopics[lesson.id] ?? [],
    [reviewTopics],
  );

  const addReviewTopic = useCallback((lessonId: string) => {
    setNewTopicInput((inputs) => {
      const value = (inputs[lessonId] ?? "").trim();
      if (!value) return inputs;
      setReviewTopics((prev) => {
        const current = prev[lessonId] ?? [];
        if (current.some((t) => t.toLowerCase() === value.toLowerCase())) return prev;
        return { ...prev, [lessonId]: [...current, value] };
      });
      return { ...inputs, [lessonId]: "" };
    });
  }, []);

  const removeReviewTopic = useCallback((lessonId: string, topic: string) => {
    setReviewTopics((prev) => ({
      ...prev,
      [lessonId]: (prev[lessonId] ?? []).filter((t) => t !== topic),
    }));
  }, []);

  // Commit the reviewed topics to the lesson outline → it becomes studyable.
  const confirmTopics = useCallback(
    async (lessonId: string) => {
      if (!courseId || confirmingLessonId) return;
      const finalTopics = (reviewTopics[lessonId] ?? []).map((t) => t.trim()).filter(Boolean);
      if (finalTopics.length === 0) return;
      setConfirmingLessonId(lessonId);
      try {
        const { course } = await studentApi.setSelfStudyLessonTopics(courseId, lessonId, finalTopics);
        setCourseData(course);
        setReviewTopics((prev) => {
          const next = { ...prev };
          delete next[lessonId];
          return next;
        });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to save topics.");
      } finally {
        setConfirmingLessonId(null);
      }
    },
    [courseId, confirmingLessonId, reviewTopics],
  );

  // Self-study: remove a lesson the student no longer wants.
  const [lessonToDelete, setLessonToDelete] = useState<CourseLesson | null>(null);

  const deleteLesson = useCallback(
    async (lessonId: string) => {
      if (!courseId || deletingLessonId) return;
      setDeletingLessonId(lessonId);
      try {
        const { course } = await studentApi.deleteSelfStudyLesson(courseId, lessonId);
        setCourseData(course);
        setPromptUploadLessonId((current) => (current === lessonId ? null : current));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to delete lesson.");
      } finally {
        setDeletingLessonId(null);
        setLessonToDelete(null);
      }
    },
    [courseId, deletingLessonId],
  );

  // "Attach from course library": link an already-uploaded course file (one not
  // yet tied to a lesson) to this lesson, then drop into the topic-review flow.
  const [attachForLesson, setAttachForLesson] = useState<string | null>(null);
  const [librarySources, setLibrarySources] = useState<{ id: string; title: string; type: string; lesson_id: string | null }[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [attachingSourceId, setAttachingSourceId] = useState<string | null>(null);

  const openLibrary = useCallback(
    async (lessonId: string) => {
      if (!courseId) return;
      setAttachForLesson(lessonId);
      setLibraryLoading(true);
      try {
        const { sources } = await studentApi.listSources(courseId);
        setLibrarySources(sources.filter((s) => !s.lesson_id));
      } catch {
        setLibrarySources([]);
      } finally {
        setLibraryLoading(false);
      }
    },
    [courseId],
  );

  const attachFromLibrary = useCallback(
    async (sourceId: string) => {
      if (!courseId || !attachForLesson) return;
      setAttachingSourceId(sourceId);
      try {
        const { topics } = await studentApi.attachSourceToLesson(courseId, sourceId, attachForLesson);
        await reloadCourse();
        setReviewTopics((prev) => ({ ...prev, [attachForLesson]: topics }));
        setPromptUploadLessonId((current) => (current === attachForLesson ? null : current));
        setAttachForLesson(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to attach material.");
      } finally {
        setAttachingSourceId(null);
      }
    },
    [courseId, attachForLesson, reloadCourse],
  );

  // Load (or generate, if a new assessment was taken) versioned study materials for a topic.
  // Any already-saved revisions are shown immediately so the learner can keep reading
  // them while a new revision (if needed) is generated in the background.
  const triggerMaterialGeneration = useCallback(
    async (topic: string) => {
      if (!courseId) return;
      // Mark this topic as the one being loaded; stale runs bail out below.
      materialTopicRef.current = topic;
      const isStale = () => materialTopicRef.current !== topic;

      // 1. Instantly surface existing revisions (cheap GET — no AI generation).
      let prevLatest: number | null = null;
      try {
        const { versions } = await studentApi.getStudyMaterialVersions(courseId, topic);
        if (isStale()) return; // user switched topics while this was in flight
        if (versions.length) {
          const latestExisting = versions[versions.length - 1]; // versions are oldest-first
          prevLatest = latestExisting.version;
          setMaterialVersions(versions);
          applyVersion(latestExisting, topic);
          setNotesLoading(false);
          setFlashcardsLoading(false);
        } else {
          // No saved revisions yet for THIS topic — clear any stale bar from the
          // previously viewed topic and show the first-time loader.
          setMaterialVersions([]);
          setSelectedVersion(null);
          setNotesLoading(true);
          setFlashcardsLoading(true);
        }
      } catch {
        setNotesLoading(true);
        setFlashcardsLoading(true);
      }

      // 2. Refresh/generate the latest in the background. If a new revision is
      //    produced, only auto-switch to it when the learner is still viewing what
      //    was the latest — never yank them off an older revision they opened.
      //    generateAndSave reuses an in-flight prefetch for this topic (so a click
      //    on a still-prebuilding topic resolves as soon as that finishes).
      setRegenerating(true);
      try {
        const { latest, versions } = await generateAndSave(courseId, topic);
        if (isStale()) return; // a newer topic load owns the view now
        setMaterialVersions(versions);
        const userOnPrevLatest = selectedVersionRef.current === prevLatest;
        if (prevLatest === null || (latest.version !== prevLatest && userOnPrevLatest)) {
          applyVersion(latest, topic);
        }
      } catch {
        if (!isStale() && prevLatest === null) {
          setNotes(null);
          setFlashcards([]);
          setPodcast(null);
          setMaterialVersions([]);
          setSelectedVersion(null);
        }
      } finally {
        if (!isStale()) {
          setRegenerating(false);
          setNotesLoading(false);
          setFlashcardsLoading(false);
        }
      }
    },
    [courseId, applyVersion, generateAndSave],
  );

  // Seed the chat with a welcome message, then replace it with any persisted
  // conversation for this topic (so chat survives reloads and revisits).
  const hydrateChat = useCallback(
    async (topic: string, welcome: string) => {
      setChatMessages([{ role: "ai", text: welcome }]);
      if (!courseId) return;
      try {
        const { messages } = await studentApi.getTutorHistory(courseId, topic);
        if (messages.length) {
          setChatMessages(
            messages.map((m) => ({ role: m.role === "assistant" ? "ai" : "user", text: m.content })),
          );
        }
      } catch {
        /* keep the welcome message on failure */
      }
    },
    [courseId],
  );

  // Handle Query Parameters (from Knowledge Map or Dashboard redirects)
  useEffect(() => {
    const topicParam = searchParams.get("topic");
    const tabParam = searchParams.get("tab");
    const diagnosticParam = searchParams.get("diagnostic");

    if (diagnosticParam === "true" || diagnosticParam === "1") {
      setDiagnosticOpen(true);
    }

    if (topicParam && courseId) {
      const decodedTopic = decodeURIComponent(topicParam);
      setCurrentTopic(decodedTopic);
      setStudyStarted(true);
      triggerMaterialGeneration(decodedTopic);
      hydrateChat(
        decodedTopic,
        `Let's explore ${decodedTopic}. I've prepared grounded study material in the sidebar — ask me anything to go deeper.`,
      );
    }

    if (tabParam && ["notes", "flashcards", "podcast", "visual"].includes(tabParam)) {
      setActiveMode(tabParam as Mode);
    }
  }, [searchParams, courseId, triggerMaterialGeneration, hydrateChat]);

  // Auto-scroll chat
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, generating]);

  const buildHistory = (msgs: typeof chatMessages) =>
    msgs
      .filter((m) => m.text && !m.check)
      .map((m) => ({ role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user", content: m.text }));

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? chatInput).trim();
      if (!msg || generating || !courseId) return;
      setChatInput("");

      const topic = currentTopic || msg;
      if (!currentTopic) setCurrentTopic(topic);

      const history = buildHistory(chatMessages);
      setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
      setGenerating(true);

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        if (!studyStarted) {
          setStudyStarted(true);
          triggerMaterialGeneration(topic);
        }
        for await (const event of studentApi.tutorStreamFetch(
          courseId,
          topic,
          msg,
          history,
          { modality, pace },
          ctrl.signal,
        )) {
          if (event.type === "delta") {
            setChatMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "ai" && !last.check) {
                return [...prev.slice(0, -1), { role: "ai", text: last.text + (event.text as string) }];
              }
              return [...prev, { role: "ai", text: event.text as string }];
            });
          } else if (event.type === "check") {
            const check = event.data as { question: string; hint: string };
            setChatMessages((prev) => [...prev, { role: "ai", text: "", check }]);
          } else if (event.type === "done") {
            break;
          } else if (event.type === "error") {
            setChatMessages((prev) => [...prev, { role: "ai", text: `Error: ${event.message}` }]);
            break;
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          setChatMessages((prev) => [
            ...prev,
            { role: "ai", text: "Sorry, I couldn't reach the tutor. Please try again." },
          ]);
        }
      } finally {
        setGenerating(false);
      }
    },
    [chatInput, chatMessages, currentTopic, generating, courseId, modality, pace, studyStarted, triggerMaterialGeneration],
  );

  // Reset the lesson chat: clears the visible conversation but re-seeds a fresh
  // greeting so the chat never looks empty. The tutor's durable memory is kept
  // server-side, so it still remembers the learner.
  const clearChat = useCallback(async () => {
    abortRef.current?.abort();
    if (courseId && currentTopic) {
      try {
        await studentApi.clearTutorHistory(courseId, currentTopic);
      } catch {
        /* clear locally regardless */
      }
    }
    const greeting = currentTopic
      ? `Fresh start! Let's keep exploring **${currentTopic}** — ask me anything, or tell me what to adjust in your study material.`
      : `Fresh start! Ask me anything about this lesson, or tell me what to adjust in your study material.`;
    setChatMessages([{ role: "ai", text: greeting }]);
  }, [courseId, currentTopic]);

  // When a lesson opens, eagerly build + persist study material (revision 1) for
  // EVERY topic in it, in parallel — so switching topics shows ready notes
  // instead of a ~15s wait. Idempotent + deduped via generateAndSave: topics that
  // already have revisions just return them; after a quiz, topics with new
  // assessment activity get their next revision regenerated here in the background.
  const prefetchLessonMaterials = useCallback(
    (lesson: CourseLesson, skipTopic?: string) => {
      if (!courseId) return;
      for (const topic of lesson.outline) {
        if (topic === skipTopic) continue; // the focus topic is already loading
        generateAndSave(courseId, topic).catch(() => {
          /* best-effort prebuild; the topic still generates on click if this fails */
        });
      }
    },
    [courseId, generateAndSave],
  );

  // Selecting a lesson opens the full adaptive study workspace scoped to that
  // lesson's topic set. The tutor is grounded in the course material.
  const startLesson = useCallback(
    (lesson: CourseLesson) => {
      setDiagnosticOpen(false);
      // Can't generate study material without source material — prompt the
      // student to upload it instead of opening an empty smart-notes page.
      if (lesson.materials.length === 0) {
        setPromptUploadLessonId(lesson.id);
        setLoadError("");
        // Return to the lesson list so the upload prompt under this lesson shows.
        setStudyStarted(false);
        setActiveLesson(null);
        return;
      }
      // Material uploaded but topics not yet confirmed — keep the student on the
      // list where the topic-review editor is shown.
      if (lesson.outline.length === 0) {
        setStudyStarted(false);
        setActiveLesson(null);
        return;
      }
      const focusTopic = lesson.outline[0] ?? lesson.title;
      setActiveLesson(lesson);
      setCurrentTopic(focusTopic);
      setStudyStarted(true);
      setActiveMode("notes");
      triggerMaterialGeneration(focusTopic);
      // Pre-build the rest of this lesson's topics in the background so switching
      // to them is instant (notes already generated + saved).
      prefetchLessonMaterials(lesson, focusTopic);
      hydrateChat(
        focusTopic,
        `Welcome to Lesson ${lesson.lesson}: ${lesson.title}. I've built grounded study material from this lesson's ${lesson.materials.length} source file${lesson.materials.length === 1 ? "" : "s"}, covering ${lesson.outline.length} topic${lesson.outline.length === 1 ? "" : "s"}. Ready when you are!`,
      );
    },
    [triggerMaterialGeneration, prefetchLessonMaterials, hydrateChat, setDiagnosticOpen],
  );

  // Jump straight into studying a single topic from the sidebar — no need to go
  // through a lesson or the knowledge map.
  const startTopic = useCallback(
    (topic: string) => {
      setDiagnosticOpen(false);
      setCurrentTopic(topic);
      setStudyStarted(true);
      setActiveMode("notes");
      triggerMaterialGeneration(topic);
      hydrateChat(
        topic,
        `Let's dive into ${topic}. I've prepared grounded study material in the sidebar — ask me anything to go deeper.`,
      );
    },
    [triggerMaterialGeneration, hydrateChat, setDiagnosticOpen],
  );

  // Return to the lesson-selection screen for this course (without leaving it).
  const exitToLessons = useCallback(() => {
    abortRef.current?.abort();
    setStudyStarted(false);
    setActiveLesson(null);
    setCurrentTopic("");
    setChatMessages([]);
    setNotes(null);
    setFlashcards([]);
    setDiagnosticOpen(false);
  }, [setDiagnosticOpen]);

  const suggestions =
    allTopics.slice(0, 4).map((t) => `Explain ${t}`) ||
    [];

  const NAV_TABS: { id: ClassView; label: string; icon: any }[] = [
    { id: "course", label: "Course", icon: FolderOpen },
    { id: "learning", label: "Learning", icon: GraduationCap },
    { id: "tutor", label: "AI Tutor", icon: MessageCircle },
    { id: "socratic", label: "Socratic AI", icon: Sparkles },
    { id: "board", label: "Q&A Board", icon: HelpCircle },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f0f6ff] text-[#1d1d1f] font-sans">
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />

      {/* ── Horizontal navbar ────────────────────────────────── */}
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/60 bg-white/55 backdrop-blur-md px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/student" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow">
              ES
            </div>
            <span className="hidden sm:block text-sm font-bold tracking-tight text-foreground font-display truncate max-w-[160px]">
              {course?.name || "EdSynapse"}
            </span>
          </Link>
          <span className="hidden md:inline-block rounded-full border border-primary/10 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold text-primary">
            {isSelfStudy ? "Self-Study" : code}
          </span>
        </div>

        <nav className="flex items-center gap-1 rounded-2xl border border-white/60 bg-white/50 p-1 shadow-sm">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.97]",
                view === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-white hover:text-foreground",
              )}
            >
              <tab.icon className="w-3.5 h-3.5" strokeWidth={2.4} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <Link
          href="/student"
          className="hidden sm:flex items-center gap-1 rounded-full border border-primary/10 bg-white/60 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
        >
          <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span>All Courses</span>
        </Link>
      </header>

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
      {view === "course" ? (
        <CoursePanel course={course} courseColor={courseColor} />
      ) : view === "tutor" ? (
        <ConversationPanel
          key={`tutor-${courseId}`}
          surface="tutor"
          courseId={courseId}
          title="AI Tutor"
          subtitle={`Your AI Tutor for ${course?.name ?? "this course"} — grounded in your material`}
          accent="#10B981"
          welcome={
            hasPublishedMaterial
              ? `Hi! I'm your AI Tutor for ${course?.name ?? "this course"}. Ask me any questions about the course material — I'll explain concepts clearly and guide you through the topics, grounded in your uploaded material.`
              : isSelfStudy
                ? `Hi! I'm your AI Tutor. Add some material to ${course?.name ?? "this course"} and I'll explain it clearly, grounded in your sources.`
                : `Hi! I'm your AI Tutor. Your teacher hasn't published any material for ${course?.name ?? "this course"} yet — once they do, I can guide you through it, grounded in those sources.`
          }
          emptyHint="Ask anything about the course…"
          newLabel="New tutor chat"
          suggestions={chatSuggestions}
          stream={(topicKey, message, history, signal) =>
            studentApi.tutorStreamFetch(
              courseId!,
              course?.name ?? "this course",
              message,
              history,
              { modality, pace },
              signal,
              topicKey,
            )
          }
        />
      ) : view === "socratic" ? (
        <ConversationPanel
          key={`socratic-${courseId}`}
          surface="socratic"
          courseId={courseId}
          title="Socratic AI"
          subtitle={`Challenge your thinking with Socratic dialogue for ${course?.name ?? "this course"}`}
          accent="#6366F1"
          welcome={
            hasPublishedMaterial
              ? `Hi! I'm your Socratic AI guide for ${course?.name ?? "this course"}. I won't just give you direct facts. Instead, I'll ask probing questions to challenge your assumptions, expose logic gaps, and guide you to discover the concepts for yourself. How would you explain what you've learned from this course so far?`
              : isSelfStudy
                ? `Hi! I'm your Socratic AI guide. Add some study material to ${course?.name ?? "this course"}, and we can explore it. Let me know what you want to teach me today!`
                : `Hi! I'm your Socratic AI guide. Once your teacher publishes materials for ${course?.name ?? "this course"}, I can ask you questions to test and deepen your understanding.`
          }
          emptyHint="Ask a question, and let the dialogue begin…"
          newLabel="New Socratic chat"
          suggestions={chatSuggestions}
          stream={(topicKey, message, history, signal) =>
            studentApi.socraticStreamFetch(
              courseId!,
              course?.name ?? "this course",
              message,
              history,
              { modality, pace },
              signal,
              topicKey,
            )
          }
        />
      ) : view === "board" ? (
        <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
          <DiscussionBoard courseId={courseId!} />
        </div>
      ) : (
      <>
      {/* ── Sidebar (collapsible + drag-resizable) ───────────── */}
      <aside
        style={{ width: sidebarCollapsed ? 64 : leftSidebar.width }}
        className={cn(
          "relative hidden md:flex shrink-0 flex-col border-r border-white/70 bg-white/45 backdrop-blur-md z-10 overflow-hidden ease-in-out",
          // Animate width on collapse/expand, but not while actively dragging.
          leftSidebar.resizing ? "" : "transition-[width] duration-300"
        )}
      >
        {/* Drag handle on the right edge — only when expanded */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={leftSidebar.onMouseDown}
            title="Drag to resize"
            className="absolute top-0 right-0 z-20 h-full w-1.5 cursor-col-resize transition-colors hover:bg-primary/25 active:bg-primary/40"
          />
        )}
        {/* Header: just the space/classroom label + collapse toggle. The app
            brand lives in the top navbar — no duplicate logo here. */}
        <div className={cn("flex items-center border-b border-white/50 py-3.5", sidebarCollapsed ? "justify-center px-2" : "justify-between gap-2 px-4")}>
          {!sidebarCollapsed && (
            <span className="truncate text-[9px] font-extrabold uppercase tracking-wider text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
              {isSelfStudy ? "Self-Study Space" : `Classroom ${code}`}
            </span>
          )}
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            type="button"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-8 h-8 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/40 text-muted-foreground transition-all hover:bg-white hover:text-foreground active:scale-[0.95]"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
        {!sidebarCollapsed && (
          <div className="border-b border-white/40 px-4 py-4 space-y-2.5">
            {currentTopic && (
              <p className="truncate text-sm font-bold text-foreground font-display">{currentTopic}</p>
            )}
            {/* Jump to this course's overall knowledge analysis. */}
            <Link
              href={courseId ? `/student/strengths-gaps?course=${courseId}` : "/student/strengths-gaps"}
              aria-disabled={!courseId}
              className={cn(
                "flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs font-bold transition-all duration-150 active:scale-[0.98]",
                "border-primary/15 bg-gradient-to-tr from-primary/5 to-blue-500/5 text-primary hover:bg-white",
                !courseId && "pointer-events-none opacity-40",
              )}
            >
              <Network className="w-4 h-4 shrink-0" />
              <span>Strengths & Gaps</span>
              <ChevronRight className="ml-auto w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setDiagnosticOpen(true)}
              disabled={!courseId}
              className={cn(
                "flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-40",
                diagnosticOpen
                  ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
                  : "border-primary/15 bg-gradient-to-tr from-primary/5 to-blue-500/5 text-primary hover:bg-white",
              )}
            >
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span>Diagnostic Test</span>
              <ChevronRight className="ml-auto w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sidebar Navigation */}
        {sidebarCollapsed ? (
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-hide flex flex-col items-center">
            {studyStarted &&
              MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => { setActiveMode(mode.id); setDiagnosticOpen(false); }}
                  title={mode.label}
                  className={cn(
                    "flex w-10 h-10 shrink-0 items-center justify-center rounded-xl cursor-pointer transition-all duration-150 hover:scale-110 active:scale-[0.95]",
                    activeMode === mode.id
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-white/40 hover:text-foreground"
                  )}
                >
                  <mode.icon className="w-4 h-4" strokeWidth={2} />
                </button>
              ))}

            {studyStarted && lessons.length > 0 && <div className="my-1 h-px w-8 bg-white/40" />}

            {lessons.map((lesson) => {
              const isActive = activeLesson?.id === lesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => startLesson(lesson)}
                  title={`Lesson ${lesson.lesson} · ${lesson.title}`}
                  className={cn(
                    "flex w-10 h-10 shrink-0 flex-col items-center justify-center rounded-xl text-white text-[10px] font-black shadow-sm cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-[0.95]",
                    isActive ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"
                  )}
                  style={{ backgroundColor: courseColor }}
                >
                  L{lesson.lesson}
                </button>
              );
            })}
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-hide">
          {studyStarted && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Study Material</p>
                <nav className="space-y-1">
                  {MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => { setActiveMode(mode.id); setDiagnosticOpen(false); }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-semibold cursor-pointer transition-all duration-150 hover:scale-[1.02] hover:shadow-md border border-transparent",
                        activeMode === mode.id
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "text-muted-foreground hover:bg-white/60 hover:text-foreground hover:border-white/80"
                      )}
                    >
                      <mode.icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                      <span>{mode.label}</span>
                      {activeMode === mode.id && <ChevronRight className="ml-auto w-3.5 h-3.5" />}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="border-t border-white/40 pt-4">
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assessment</p>
                <Link
                  href={`/student/class/${code}/assessment`}
                  className="flex w-full items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-500/5 px-3 py-2.5 text-left text-xs font-bold text-emerald-700 cursor-pointer transition-all duration-150 hover:scale-[1.02] hover:shadow-md hover:bg-emerald-500/10 active:scale-[0.98]"
                >
                  <Trophy className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Take Assessment</span>
                  <ChevronRight className="ml-auto w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Topics for the lesson currently being studied — only shown once a
             lesson is opened, scoped to that lesson's outline. */}
          {activeLesson && activeLesson.outline.length > 0 && (
            <div className="border-t border-white/40 pt-4">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
                Lesson {activeLesson.lesson} Topics
              </p>
              <div className="space-y-1">
                {activeLesson.outline.map((t) => (
                  <button
                    key={t}
                    onClick={() => startTopic(t)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold cursor-pointer transition-all border border-transparent duration-150 hover:scale-[1.02] hover:shadow-sm",
                      currentTopic === t
                        ? "text-primary bg-primary/10 font-bold border-primary/20"
                        : "text-muted-foreground hover:bg-white/60 hover:text-foreground hover:border-white/80"
                    )}
                  >
                    <BookOpenText className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    <span className="truncate">{t}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lesson-wise syllabus (Course Mode) */}
          {lessons.length > 0 && (
            <div className="border-t border-white/40 pt-4">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">Course Lessons</p>
              <div className="space-y-1.5">
                {lessons.map((lesson) => {
                  const isActive = activeLesson?.id === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => startLesson(lesson)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md",
                        isActive
                          ? "border-primary/30 bg-primary/10 shadow-sm"
                          : "border-white/60 bg-white/35 hover:border-primary/30 hover:bg-white/60"
                      )}
                    >
                      <div
                        className="flex w-8 h-8 shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: courseColor }}
                      >
                        <span className="text-[7px] font-extrabold uppercase leading-none opacity-80">Ln</span>
                        <span className="text-xs font-black leading-tight">{lesson.lesson}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-xs font-bold", isActive ? "text-primary" : "text-foreground")}>
                          {lesson.title}
                        </p>
                        {lesson.outline.length > 0 ? (
                          <div className="mt-1 flex items-center gap-1.5">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/5">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${lesson.progress}%`, backgroundColor: masteryTone(lesson.progress, lesson.topicsAttempted) }}
                              />
                            </div>
                            <span className="text-[9px] font-bold" style={{ color: masteryTone(lesson.progress, lesson.topicsAttempted) }}>
                              {lesson.topicsAttempted === 0 ? "—" : `${lesson.progress}%`}
                            </span>
                          </div>
                        ) : (
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">No topics yet</p>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        )}
      </aside>

      {/* ── Main Area ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 z-10">
        {/* Top Header / Learning Profile Switcher */}
        <div className="flex h-16 items-center justify-between border-b border-white/40 bg-white/40 backdrop-blur-md px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-foreground font-display">
              {studyStarted ? MODES.find(m => m.id === activeMode)?.label : "AI Tutor Coach"}
            </span>
            {activeLesson ? (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: courseColor }}
              >
                Lesson {activeLesson.lesson} · {activeLesson.title}
              </span>
            ) : (
              <span className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                {code}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Back to this course's lesson list (only while inside a lesson) */}
            {studyStarted && lessons.length > 0 && (
              <button
                onClick={exitToLessons}
                className="flex items-center gap-1 rounded-full border border-primary/10 bg-white/60 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all active:scale-[0.97]"
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>All lessons</span>
              </button>
            )}
            {/* "All courses" lives in the top navbar (global); no duplicate here. */}
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex flex-1 overflow-hidden relative">
          {!course && !loadError ? (
            /* LOADING: course is still being fetched */
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center edsynapse-stagger">
              <div className="mb-5 w-10 h-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <p className="text-sm font-bold text-foreground font-display">Loading your learning space…</p>
              <p className="mt-1 text-xs text-muted-foreground">Fetching lessons and study material for {code}.</p>
            </div>
          ) : loadError ? (
            /* ERROR: course failed to load */
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center edsynapse-stagger">
              <div className="mb-4 flex w-12 h-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
                <X className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-foreground font-display">Couldn&apos;t load this course</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">{loadError}</p>
              <button
                onClick={() => { setLoadError(""); reloadCourse(); }}
                className="mt-4 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/95 active:scale-[0.98]"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Diagnostic Panel - always mounted to preserve in-progress state, visually toggled using hidden */}
              <div className={cn("absolute inset-0 z-20 bg-[#f0f6ff] flex flex-col min-h-0", !diagnosticOpen && "hidden")}>
                <DiagnosticPanel
                  courseId={courseId!}
                  topics={allTopics}
                  strengthsGaps={strengthsGaps}
                  isOpen={diagnosticOpen}
                  onClose={() => setDiagnosticOpen(false)}
                  phase={diagnosticPhase}
                  setPhase={setDiagnosticPhase}
                  quiz={diagnosticQuiz}
                  setQuiz={setDiagnosticQuiz}
                  answers={diagnosticAnswers}
                  setAnswers={setDiagnosticAnswers}
                  result={diagnosticResult}
                  setResult={setDiagnosticResult}
                  error={diagnosticError}
                  setError={setDiagnosticError}
                />
              </div>

              {!studyStarted ? (
            /* PRE-STUDY: Greeting Chat */
            <div className="flex flex-1 flex-col">
              <div ref={chatRef} className="flex-1 overflow-y-auto px-6 py-8">
                <div className="mx-auto max-w-xl space-y-8 mt-12">
                  <div className="text-center space-y-3 edsynapse-stagger">
                    <div className="mx-auto flex w-14 h-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-blue-600 text-white shadow-lg shadow-primary/20">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground font-display">
                      {course?.name || "Course Syllabus"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Welcome to your learning space. Select a syllabus lesson to begin.
                    </p>
                  </div>

                  {lessons.length > 0 || isSelfStudy ? (
                    /* Lesson-wise outline — selecting a lesson opens the full
                       adaptive study workspace scoped to that lesson. In self-study
                       mode the student can also add lessons + upload material. */
                    <div className="space-y-2.5 edsynapse-stagger">
                      {lessons.length > 0 && (
                        <div className="flex items-center gap-2 px-1 pb-1">
                          <BookOpen className="w-3.5 h-3.5 text-primary" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {lessons.length} {isSelfStudy ? "lesson" : "week"}{lessons.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      )}
                      {lessons.map((lesson) => {
                          const hasMaterial = lesson.materials.length > 0;
                          const uploadInputId = `lesson-upload-${lesson.id}`;
                          // Material uploaded but topics not yet confirmed.
                          const pendingReview = isSelfStudy && hasMaterial && lesson.outline.length === 0;
                          return (
                            <div key={lesson.id} className="space-y-2">
                              <div className="flex w-full items-center gap-4 rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-sm transition-all duration-150 hover:border-primary/25 hover:bg-white shadow-sm">
                                <button
                                  onClick={() => startLesson(lesson)}
                                  className="flex flex-1 items-center gap-4 text-left min-w-0 active:scale-[0.98] transition-transform"
                                >
                                  <div
                                    className="flex w-11 h-11 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-md"
                                    style={{ backgroundColor: courseColor }}
                                  >
                                    <span className="text-[8px] font-extrabold uppercase leading-none opacity-80">Lesson</span>
                                    <span className="text-base font-black leading-tight">{lesson.lesson}</span>
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <p className="truncate text-sm font-bold text-foreground font-display">{lesson.title}</p>
                                    {lesson.outline.length > 0 ? (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/5">
                                            <div
                                              className="h-full rounded-full transition-all duration-700"
                                              style={{ width: `${lesson.progress}%`, backgroundColor: masteryTone(lesson.progress, lesson.topicsAttempted) }}
                                            />
                                          </div>
                                          <span className="min-w-[34px] text-right text-[10px] font-bold" style={{ color: masteryTone(lesson.progress, lesson.topicsAttempted) }}>
                                            {lesson.topicsAttempted === 0 ? "—" : `${lesson.progress}%`}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                          {lesson.topicsAttempted === 0
                                            ? `Not started · ${lesson.outline.length} topic${lesson.outline.length === 1 ? "" : "s"}`
                                            : `${lesson.topicsAttempted} of ${lesson.outline.length} topics attempted · ${lesson.materials.length} file${lesson.materials.length === 1 ? "" : "s"}`}
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground">
                                        No topics yet · {lesson.materials.length} file{lesson.materials.length === 1 ? "" : "s"}
                                      </p>
                                    )}
                                  </div>
                                </button>
                                {isSelfStudy ? (
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    {!hasMaterial && (
                                      <input
                                        id={uploadInputId}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        disabled={uploadingLessonId === lesson.id}
                                        onChange={(e) => handleFilesUploaded(lesson.id, e.target.files, e.target)}
                                      />
                                    )}
                                    <button
                                      onClick={() => setLessonToDelete(lesson)}
                                      disabled={deletingLessonId === lesson.id}
                                      title="Delete this lesson"
                                      className="flex items-center justify-center rounded-xl border border-red-200 bg-red-500/5 px-2.5 py-2 text-red-600 transition-all hover:bg-red-500/10 active:scale-[0.96] disabled:opacity-40"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                                )}
                              </div>

                              {/* Prompt to add material right after creating a lesson — two paths:
                                 upload from device, or attach a file already in this course. */}
                              {promptUploadLessonId === lesson.id && !hasMaterial && (
                                <div className="space-y-2 edsynapse-stagger">
                                  <label
                                    htmlFor={uploadInputId}
                                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-emerald-300 bg-emerald-500/5 p-3 text-emerald-700 hover:bg-emerald-500/10 transition-all"
                                  >
                                    <Upload className="w-4 h-4 shrink-0" />
                                    <span className="text-xs font-semibold">
                                      {uploadingLessonId === lesson.id
                                        ? "Uploading your material…"
                                        : `Upload material for "${lesson.title}" from your device.`}
                                    </span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => openLibrary(lesson.id)}
                                    className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 text-primary hover:bg-primary/10 transition-all active:scale-[0.99]"
                                  >
                                    <Link2 className="w-4 h-4 shrink-0" />
                                    <span className="text-xs font-semibold">Attach a file already in this course</span>
                                  </button>
                                </div>
                              )}

                              {/* Topic review — edit the topics found in the upload
                                 before generating study material. */}
                              {pendingReview && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-500/5 p-3.5 space-y-3 edsynapse-stagger">
                                  <div>
                                    <p className="text-xs font-bold text-emerald-800 font-display">
                                      {topicsFor(lesson).length > 0
                                        ? "Topics found in your material"
                                        : "Add the topics to study"}
                                    </p>
                                    <p className="text-[10px] text-emerald-700/80">
                                      Remove any you don't need or add your own, then generate.
                                    </p>
                                  </div>

                                  {topicsFor(lesson).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {topicsFor(lesson).map((t) => (
                                        <span
                                          key={t}
                                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-foreground"
                                        >
                                          {t}
                                          <button
                                            onClick={() => removeReviewTopic(lesson.id, t)}
                                            title="Remove topic"
                                            className="text-muted-foreground hover:text-red-600 transition-colors"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <input
                                      value={newTopicInput[lesson.id] ?? ""}
                                      onChange={(e) =>
                                        setNewTopicInput((inputs) => ({ ...inputs, [lesson.id]: e.target.value }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          addReviewTopic(lesson.id);
                                        }
                                      }}
                                      placeholder="Add a custom topic…"
                                      className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-emerald-400 placeholder:text-muted-foreground"
                                    />
                                    <button
                                      onClick={() => addReviewTopic(lesson.id)}
                                      disabled={!(newTopicInput[lesson.id] ?? "").trim()}
                                      className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700 transition-all hover:bg-emerald-500/10 active:scale-[0.97] disabled:opacity-40"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => confirmTopics(lesson.id)}
                                    disabled={topicsFor(lesson).length === 0 || confirmingLessonId === lesson.id}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {confirmingLessonId === lesson.id
                                      ? "Saving topics…"
                                      : `Generate study material (${topicsFor(lesson).length} topic${topicsFor(lesson).length === 1 ? "" : "s"})`}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                      })}

                      {/* Add-lesson composer (self-study only) */}
                      {isSelfStudy && (
                        <form
                          onSubmit={(e) => { e.preventDefault(); addLesson(); }}
                          className="flex items-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-500/5 p-3"
                        >
                          <div className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                            <Plus className="w-4 h-4" />
                          </div>
                          <input
                            value={newLessonTitle}
                            onChange={(e) => setNewLessonTitle(e.target.value)}
                            placeholder={`Add Lesson ${lessons.length + 1} title…`}
                            className="flex-1 bg-transparent text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                          />
                          <button
                            type="submit"
                            disabled={!newLessonTitle.trim()}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white transition-all active:scale-[0.96] disabled:opacity-40"
                          >
                            Add Lesson
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 edsynapse-stagger">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSend(s)}
                          className="rounded-2xl border border-white/70 bg-white/45 p-4 text-left text-xs font-semibold text-foreground backdrop-blur-sm transition-all duration-150 hover:border-primary/25 hover:bg-white active:scale-[0.98] shadow-sm"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>
          ) : (
            /* POST-STUDY: Splitscreen (Notes/Flashcards on left, follow-up chat on right) */
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto max-w-2xl">
                  {materialVersions.length > 0 && (
                    <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 edsynapse-stagger">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground shrink-0">
                        Your revisions
                      </span>
                      {materialVersions.map((v) => (
                        <button
                          key={v.version}
                          onClick={() => applyVersion(v, currentTopic)}
                          className={cn(
                            "shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                            selectedVersion === v.version
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-white/60 text-muted-foreground border-white/70 hover:text-foreground"
                          )}
                          title={new Date(v.createdAt).toLocaleString()}
                        >
                          Revision {v.version}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Non-blocking notice: the learner keeps reading the current
                      revision while the next one is generated in the background. */}
                  {regenerating && !notesLoading && (
                    <div className="mb-5 flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-2.5 text-xs font-semibold text-primary edsynapse-stagger">
                      <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                      <span>Preparing your next revision… you can keep reading this one meanwhile.</span>
                    </div>
                  )}
                  {activeMode === "notes" && <NotesView notes={notes} loading={notesLoading} />}
                  {activeMode === "flashcards" && <FlashcardsView cards={flashcards} loading={flashcardsLoading} />}
                  {activeMode === "podcast" && (
                    <div className="space-y-4 edsynapse-stagger">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-base font-bold text-foreground font-display">AI Lecture Podcast</h3>
                      </div>
                      {notesLoading || !podcast ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                          <div className="mb-1 w-10 h-10 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
                          <p className="text-xs font-semibold text-muted-foreground">Writing the episode script...</p>
                        </div>
                      ) : podcast.script ? (
                        <>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => togglePodcastPlayback(podcast.script)}
                              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-[0.98] transition-all hover:bg-emerald-700"
                            >
                              {podcastPlaying ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                              {podcastPlaying ? "Pause" : "Listen to episode"}
                            </button>
                            {podcastPlaying && (
                              <button
                                onClick={stopPodcastPlayback}
                                className="px-3 py-2.5 bg-white/60 border border-white/70 text-muted-foreground rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-[0.98] transition-all hover:text-foreground"
                              >
                                <X className="w-3.5 h-3.5" /> Stop
                              </button>
                            )}
                          </div>
                          <div className="p-4 rounded-2xl bg-white/40 border border-white/60 text-xs leading-relaxed text-foreground/80 shadow-sm">
                            <Markdown>{podcast.script}</Markdown>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground py-12 text-center">
                          No podcast script available yet. Ask the tutor to generate study guides for this topic.
                        </p>
                      )}
                    </div>
                  )}
                  {activeMode === "visual" && (
                    <MindMapView notes={notes} topic={currentTopic} loading={notesLoading} />
                  )}
                </div>
              </div>

              {/* Sidebar compact chat (drag-resizable via the left-edge handle) */}
              <div
                style={{ width: chatPanel.width }}
                className="relative shrink-0 border-l border-white/40 bg-white/45 backdrop-blur-md flex flex-col justify-between z-10"
              >
                {/* Drag handle on the left edge */}
                <div
                  onMouseDown={chatPanel.onMouseDown}
                  title="Drag to resize"
                  className="absolute top-0 left-0 z-20 h-full w-1.5 -translate-x-1/2 cursor-col-resize transition-colors hover:bg-primary/25 active:bg-primary/40"
                />
                <div className="border-b border-white/40 p-4 shrink-0 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-foreground font-display">Ask EdSynapse</p>
                    <p className="text-[10px] text-muted-foreground">Adjust study guides on the fly</p>
                  </div>
                  <button
                    onClick={clearChat}
                    disabled={!chatMessages.some((m) => m.role === "user")}
                    title="Reset chat (the tutor still remembers you)"
                    className="flex w-7 h-7 shrink-0 items-center justify-center rounded-lg border border-white/60 bg-white/60 text-muted-foreground transition-all hover:text-red-600 hover:border-red-200 active:scale-[0.95] disabled:opacity-40"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {chatMessages.map((m, i) => (
                    <div key={i} className="space-y-1">
                      {m.check ? (
                        <CheckPopup
                          check={m.check}
                          onDismiss={(ans) => {
                            setChatMessages((prev) => prev.filter((_, j) => j !== i));
                            setChatMessages((prev) => [
                              ...prev,
                              { role: "user", text: ans },
                              { role: "ai", text: "Excellent check! That is correct. Let's proceed to explore photophosphorylation." },
                            ]);
                          }}
                        />
                      ) : (
                        <div className={cn("group flex gap-2.5", m.role === "user" && "justify-end")}>
                          {m.role === "ai" && (
                            <div className="flex w-6 h-6 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/10 bg-white shadow-sm">
                              <Image src="/logo.png" alt="EdSynapse" width={16} height={16} className="object-contain" />
                            </div>
                          )}
                          <div className={cn("flex max-w-[85%] flex-col gap-1", m.role === "user" && "items-end")}>
                            <div
                              className={cn(
                                "rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm font-sans",
                                m.role === "ai"
                                  ? "bg-white border border-white/60 text-foreground"
                                  : "bg-primary text-white whitespace-pre-wrap"
                              )}
                            >
                              {m.role === "ai" ? <Markdown>{m.text}</Markdown> : m.text}
                            </div>
                            {m.text && (
                              <CopyButton text={m.text} className="opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {generating && chatMessages[chatMessages.length - 1]?.role === "user" && (
                    <div className="flex gap-2.5">
                      <div className="flex w-6 h-6 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/10 bg-white shadow-sm">
                        <Image src="/logo.png" alt="EdSynapse" width={16} height={16} className="object-contain" />
                      </div>
                      <div className="flex items-center gap-1 rounded-2xl border border-white/60 bg-white px-3 py-2 shadow-sm">
                        {[0, 1, 2].map((j) => (
                          <div
                            key={j}
                            className="w-1.5 h-1.5 animate-bounce rounded-full bg-primary/40"
                            style={{ animationDelay: `${j * 120}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/40 p-3 shrink-0">
                  <div className="relative flex items-center gap-2 rounded-2xl border border-primary/15 bg-white p-1.5">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground font-sans"
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!chatInput.trim() || generating}
                      className="flex w-7 h-7 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/95 disabled:opacity-40 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </main>
      </>
      )}
      </div>

      {/* Delete-lesson confirmation modal */}
      {lessonToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl edsynapse-stagger">
            <div className="flex items-center gap-3">
              <div className="flex w-11 h-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground font-display">Delete this lesson?</h3>
                <p className="text-xs text-muted-foreground">This action can't be undone.</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-foreground/80 leading-relaxed">
              <span className="font-semibold">"{lessonToDelete.title}"</span> and any source material uploaded to it
              will be permanently removed.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setLessonToDelete(null)}
                disabled={deletingLessonId === lessonToDelete.id}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteLesson(lessonToDelete.id)}
                disabled={deletingLessonId === lessonToDelete.id}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 active:scale-[0.97] transition-all disabled:opacity-60"
              >
                {deletingLessonId === lessonToDelete.id ? "Deleting…" : "Delete lesson"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attach-from-library picker */}
      {attachForLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setAttachForLesson(null)}
        >
          <div
            className="w-full max-w-md max-h-[80vh] flex flex-col rounded-3xl bg-white p-6 shadow-2xl edsynapse-stagger"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground font-display">Attach from course library</h3>
                <p className="text-[11px] text-muted-foreground">Pick a file already uploaded to this course.</p>
              </div>
              <button onClick={() => setAttachForLesson(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 overflow-y-auto space-y-2 scrollbar-hide">
              {libraryLoading ? (
                <div className="py-10 flex justify-center">
                  <div className="w-7 h-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                </div>
              ) : librarySources.length === 0 ? (
                <p className="rounded-2xl border border-white/70 bg-white/40 p-4 text-xs text-muted-foreground">
                  No unattached files in this course. Upload one from the Course tab first, then attach it here.
                </p>
              ) : (
                librarySources.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => attachFromLibrary(s.id)}
                    disabled={attachingSourceId !== null}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/45 p-3 text-left transition-all hover:bg-white active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: courseColor }}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">{s.title}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.type}</p>
                    </div>
                    {attachingSourceId === s.id ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                    ) : (
                      <Link2 className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
