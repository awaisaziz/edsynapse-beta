"use client";

import React from "react";
import { Check, X, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Markdown from "@/components/ui/Markdown";

interface QuizCardProps {
  question: string;
  options?: string[];
  type: "mcq" | "short_answer";
  selectedAnswer: string; // For MCQ: option index string (e.g. "0", "1") or option string. For Short Answer: string.
  onSelectAnswer: (answer: string) => void;
  correctAnswer?: string; // Correct answer index string or exact answer text
  showResults?: boolean; // Whether the quiz was submitted and we want to show feedback
  explanation?: string;
  index?: number;
  className?: string;
}

export function QuizCard({
  question,
  options = [],
  type,
  selectedAnswer,
  onSelectAnswer,
  correctAnswer,
  showResults = false,
  explanation,
  index,
  className,
}: QuizCardProps) {
  const isMcq = type === "mcq";
  
  // MCQ parsing: convert index or text
  const getSelectedIndex = () => {
    if (!selectedAnswer) return -1;
    const parsed = parseInt(selectedAnswer, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < options.length) {
      return parsed;
    }
    return options.indexOf(selectedAnswer);
  };

  const getCorrectIndex = () => {
    if (!correctAnswer) return -1;
    const parsed = parseInt(correctAnswer, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < options.length) {
      return parsed;
    }
    return options.indexOf(correctAnswer);
  };

  const selectedIdx = getSelectedIndex();
  const correctIdx = getCorrectIndex();

  return (
    <div
      className={cn(
        "p-6 rounded-3xl border transition-all duration-300 backdrop-blur-md relative overflow-hidden",
        showResults
          ? selectedAnswer === correctAnswer || (isMcq && selectedIdx === correctIdx)
            ? "border-emerald-200 bg-emerald-500/5 shadow-emerald-500/5 shadow-lg"
            : "border-rose-200 bg-rose-500/5 shadow-rose-500/5 shadow-lg"
          : "border-white/70 bg-white/45 shadow-lg hover:shadow-xl",
        className
      )}
    >
      {/* Question Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground font-sans">
            Question {index !== undefined ? index + 1 : ""} • {isMcq ? "Multiple Choice" : "Short Answer"}
          </span>
          <div className="font-display">
            <Markdown className="text-base font-bold text-foreground leading-relaxed">{question}</Markdown>
          </div>
        </div>
      </div>

      {/* Answer Options or Input Field */}
      {isMcq ? (
        <div className="space-y-3">
          {options.map((option, idx) => {
            const isSelected = selectedIdx === idx;
            const isCorrect = correctIdx === idx;
            const wasIncorrectlySelected = isSelected && !isCorrect;

            // The choice letter is the option's position (A, B, C, …). Strip any
            // leading "A. " / "B) " label baked into the text so it isn't shown
            // twice and never reads like part of the answer.
            const letter = String.fromCharCode(65 + idx);
            const optionText = option.replace(/^\s*[A-Za-z][.)]\s+/, "");

            let optionStyles = "border-primary/10 bg-white/40 hover:bg-white/70 hover:border-primary/30 text-foreground";
            let badgeStyles = "border-primary/20 bg-white text-primary";
            let badgeContent: React.ReactNode = letter;

            if (showResults) {
              if (isCorrect) {
                optionStyles = "border-emerald-500 bg-emerald-50 text-emerald-900 font-medium";
                badgeStyles = "border-emerald-600 bg-emerald-600 text-white";
                badgeContent = <Check className="w-3.5 h-3.5" />;
              } else if (wasIncorrectlySelected) {
                optionStyles = "border-rose-500 bg-rose-50 text-rose-900 font-medium";
                badgeStyles = "border-rose-600 bg-rose-600 text-white";
                badgeContent = <X className="w-3.5 h-3.5" />;
              } else {
                optionStyles = "border-primary/5 bg-white/20 text-muted-foreground opacity-60";
                badgeStyles = "border-primary/10 bg-white/10 text-muted-foreground";
              }
            } else if (isSelected) {
              optionStyles = "border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/20";
              badgeStyles = "border-primary bg-primary text-white";
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={showResults}
                onClick={() => onSelectAnswer(idx.toString())}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border flex items-center justify-between transition-all duration-150 active:scale-[0.99] font-sans",
                  optionStyles
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 text-xs font-bold transition-all duration-150",
                      badgeStyles
                    )}
                  >
                    {badgeContent}
                  </div>
                  <Markdown className="min-w-0 flex-1 pt-0.5 text-sm leading-snug break-words">{optionText}</Markdown>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            disabled={showResults}
            value={selectedAnswer}
            onChange={(e) => onSelectAnswer(e.target.value)}
            placeholder="Type your detailed explanation here..."
            className={cn(
              "w-full h-32 p-4 rounded-2xl border font-sans text-sm focus:outline-none transition-all duration-150",
              showResults
                ? "bg-white/20 border-primary/10 text-foreground cursor-not-allowed"
                : "bg-white/40 border-primary/15 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
            )}
          />

          {showResults && (
            <div className="p-4 rounded-2xl bg-white/60 border border-primary/10 space-y-2 edsynapse-stagger">
              <span className="text-[10px] font-bold text-primary uppercase font-sans tracking-wide">
                Suggested Correct Answer
              </span>
              <Markdown className="text-xs text-foreground/80 leading-relaxed">{correctAnswer ?? ""}</Markdown>
            </div>
          )}
        </div>
      )}

      {/* Explanation panel in showResults state */}
      {showResults && explanation && (
        <div
          className={cn(
            "mt-4 p-4 rounded-2xl border flex items-start gap-3 edsynapse-stagger",
            selectedAnswer === correctAnswer || (isMcq && selectedIdx === correctIdx)
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-950"
              : "bg-amber-500/10 border-amber-500/20 text-amber-950"
          )}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-sans opacity-80">
              AI Tutor Feedback
            </span>
            <Markdown className="text-xs leading-relaxed">{explanation}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
