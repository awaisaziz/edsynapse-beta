"use client";

import { useEffect, useRef, useState } from "react";
import { LifeBuoy, Send, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupportMessage {
  id: string;
  from: "user" | "admin";
  body: string;
  at: string;
}

interface SupportThread {
  id: string;
  messages: SupportMessage[];
}

interface ContactAdminModalProps {
  open: boolean;
  onClose: () => void;
}

/** A teacher or student support conversation with the platform admin. The caller's
 *  identity is derived server-side from the session — no identity prop. Shows the
 *  existing thread (if any) and lets the user send a new message. */
export function ContactAdminModal({ open, onClose }: ContactAdminModalProps) {
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setSent(false);

    const fetchSupport = async () => {
      try {
        const res = await fetch("/api/support", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { thread: SupportThread | null };
        setThread(data.thread);
      } catch {
        /* leave thread as-is */
      }
    };

    fetchSupport();
    const interval = setInterval(fetchSupport, 4000);

    return () => {
      clearInterval(interval);
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread]);

  if (!open) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { thread: SupportThread | null };
      setThread(data.thread);
      setBody("");
      setSent(true);
      setTimeout(() => setSent(false), 1800);
    } catch {
      /* keep the draft so the user can retry */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="liquid-shell relative w-full max-w-lg overflow-hidden rounded-[34px] p-3 shadow-2xl edsynapse-stagger">
        <div className="rounded-[26px] border border-white/70 bg-[#fbfbfd]/92 p-6 shadow-inner backdrop-blur-2xl">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 flex w-8 h-8 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground transition-all"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>

          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[10px] font-extrabold tracking-wider uppercase text-primary">
            <LifeBuoy className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Support</span>
          </div>
          <h2 className="mb-1 text-2xl font-bold font-display text-foreground leading-tight">
            Message the Admin
          </h2>
          <p className="mb-5 text-xs text-muted-foreground">
            Questions about your account, courses, or a problem? Send the EdSynapse team a message.
          </p>

          {/* Conversation history */}
          {thread && thread.messages.length > 0 && (
            <div
              ref={scrollRef}
              className="mb-4 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-primary/10 bg-white/60 p-3 scrollbar-hide"
            >
              {thread.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-5",
                      m.from === "user"
                        ? "rounded-tr-sm bg-primary text-white"
                        : "rounded-tl-sm border border-primary/10 bg-white text-foreground"
                    )}
                  >
                    {m.from === "admin" && (
                      <span className="mb-0.5 flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-primary">
                        <ShieldCheck className="w-3 h-3" /> Admin
                      </span>
                    )}
                    {m.body}
                    <span className={cn("mt-0.5 block text-[9px]", m.from === "user" ? "text-white/70" : "text-muted-foreground")}>
                      {m.at}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message to the admin..."
              rows={3}
              className="w-full resize-none rounded-2xl border border-primary/15 bg-white/80 p-3.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <div className="flex items-center justify-between gap-3">
              <span className={cn("text-xs font-semibold text-emerald-600 transition-opacity", sent ? "opacity-100" : "opacity-0")}>
                Message sent ✓
              </span>
              <button
                type="submit"
                disabled={!body.trim() || sending}
                className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-xs font-bold text-white transition-all hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
