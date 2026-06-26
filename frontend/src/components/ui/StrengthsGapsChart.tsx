"use client";

import React from "react";
import { HelpCircle, MessageSquare, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { StrengthsGapsTopic, TopicMastery } from "@/lib/strengthsGaps";

interface StrengthsGapsChartProps {
  topics: StrengthsGapsTopic[];
  onAction?: (topicId: string, actionType: "tutor" | "quiz" | "review") => void;
  showActions?: boolean;
  className?: string;
}

export function StrengthsGapsChart({
  topics,
  onAction,
  showActions = false,
  className,
}: StrengthsGapsChartProps) {
  const getStatusConfig = (status: TopicMastery) => {
    switch (status) {
      case "strong":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30",
          bar: "bg-emerald-500",
          label: "Strong",
        };
      case "moderate":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30",
          bar: "bg-amber-500",
          label: "Moderate",
        };
      case "needs_improvement":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/30",
          bar: "bg-rose-500",
          label: "Needs Review",
        };
      default:
        return {
          bg: "bg-zinc-50 text-zinc-700 border-zinc-200/50",
          bar: "bg-zinc-500",
          label: "Unknown",
        };
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {topics.map((topic, index) => {
        const config = getStatusConfig(topic.status);
        return (
          <div
            key={topic.id}
            style={{ animationDelay: `${index * 60}ms` }}
            className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border border-white/70 bg-white/45 backdrop-blur-md hover:bg-white/60 transition-all duration-200 edsynapse-stagger gap-4"
          >
            {/* Topic details */}
            <div className="flex-1 space-y-2.5 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground truncate font-display">
                  {topic.topic}
                </h4>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    config.bg
                  )}
                >
                  {config.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500 ease-out", config.bar)}
                    style={{ width: `${topic.score}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground/80 shrink-0 w-8 text-right font-mono">
                  {topic.score}%
                </span>
              </div>

              {/* Topic meta info */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-sans">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Attempts: {topic.quizAttempts}
                </span>
                <span>•</span>
                <span>Active: {topic.lastAttempted}</span>
              </div>
            </div>

            {/* Actions (Tutor, Quiz, Notes) */}
            {showActions && (
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => onAction?.(topic.id, "tutor")}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl text-primary bg-primary/5 hover:bg-primary/10 active:scale-[0.97] transition-all border border-primary/10"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Tutor</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAction?.(topic.id, "quiz")}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.97] transition-all border border-emerald-100"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Quiz</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
