"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Palette, Archive, ArchiveRestore, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared course-card color palette (also the default-color source). */
export const COURSE_PALETTE = [
  "#0066cc",
  "#0891b2",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#db2777",
  "#475569",
  "#ca8a04",
];

interface CourseCardMenuProps {
  color: string;
  archived: boolean;
  /** Color change allowed (false for a student's enrolled class). */
  canRecolor?: boolean;
  /** Delete allowed (false for a student's enrolled class). */
  canDelete?: boolean;
  busy?: boolean;
  onRecolor: (color: string) => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

// The "⋯" overflow menu rendered on each course card. Lives inside a <Link>, so
// every interactive element stops propagation + prevents default to avoid
// navigating when the user is managing the card.
export function CourseCardMenu({
  color,
  archived,
  canRecolor = true,
  canDelete = true,
  busy = false,
  onRecolor,
  onToggleArchive,
  onDelete,
}: CourseCardMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "colors" | "confirmDelete">("menu");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView("menu");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div ref={ref} className="relative" onClick={stop}>
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
          setView("menu");
        }}
        aria-label="Course options"
        className="flex w-8 h-8 items-center justify-center rounded-xl border border-white/60 bg-white/70 text-muted-foreground transition-all hover:bg-white hover:text-foreground active:scale-[0.95]"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-2xl border border-white/70 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl edsynapse-stagger">
          {view === "menu" && (
            <div className="space-y-0.5">
              {canRecolor && (
                <button
                  type="button"
                  onClick={(e) => {
                    stop(e);
                    setView("colors");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-primary/5"
                >
                  <Palette className="w-4 h-4 text-primary" />
                  Change color
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  stop(e);
                  onToggleArchive();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-primary/5 disabled:opacity-50"
              >
                {archived ? (
                  <>
                    <ArchiveRestore className="w-4 h-4 text-emerald-600" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 text-amber-600" />
                    Archive
                  </>
                )}
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    stop(e);
                    setView("confirmDelete");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}

          {view === "colors" && (
            <div className="p-1.5">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Card color
              </p>
              <div className="grid grid-cols-4 gap-2">
                {COURSE_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={(e) => {
                      stop(e);
                      onRecolor(c);
                      setOpen(false);
                      setView("menu");
                    }}
                    aria-label={`Set color ${c}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl shadow-sm transition-transform hover:scale-110 active:scale-95"
                    style={{ backgroundColor: c }}
                  >
                    {color.toLowerCase() === c.toLowerCase() && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === "confirmDelete" && (
            <div className="p-2 space-y-2.5">
              <p className="text-xs font-bold text-foreground">Delete this course?</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                This permanently removes the course and all its content. This can&apos;t be undone.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    stop(e);
                    setView("menu");
                  }}
                  className="flex-1 rounded-xl border border-primary/10 bg-white/70 px-3 py-2 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    stop(e);
                    onDelete();
                    setOpen(false);
                  }}
                  className={cn(
                    "flex-1 rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-bold text-white transition-all hover:bg-rose-700 active:scale-[0.97] disabled:opacity-60",
                  )}
                >
                  {busy ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
