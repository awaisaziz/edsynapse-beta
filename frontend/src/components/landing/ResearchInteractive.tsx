"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircleQuestion,
  Target,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  FileText,
  Database,
  LineChart,
  BrainCircuit
} from "lucide-react";

function formatMathText(text: string) {
  const parts = text.split("$");
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      const formattedPart = part
        .replace(/\^2/g, "²")
        .replace(/\//g, "⁄"); // Nice fraction slash
      return (
        <span
          key={index}
          className="font-serif italic font-semibold text-[#8ebaff] mx-0.5 bg-white/10 px-1 py-0.5 rounded shadow-sm"
        >
          {formattedPart}
        </span>
      );
    }
    return part;
  });
}

interface Pillar {
  id: string;
  icon: React.ComponentType<any>;
  title: string;
  subtitle: string;
  theory: string;
  description: string;
  citation: string;
}

const PILLARS: Pillar[] = [
  {
    id: "socratic",
    icon: MessageCircleQuestion,
    title: "Socratic tutoring",
    subtitle: "Scaffolded dialogue over direct answers",
    theory: "Vygotsky's Zone of Proximal Development",
    description:
      "Instead of giving the direct answer, the AI tutor asks guiding questions. This guides the student to bridge their own gaps and builds active reasoning skills.",
    citation: "Wood, D., Bruner, J. S., & Ross, G. (1976). The role of tutoring in problem solving.",
  },
  {
    id: "mastery",
    icon: Target,
    title: "Mastery learning",
    subtitle: "Verify understanding before moving forward",
    theory: "Bloom's 2-Sigma Problem",
    description:
      "EdSynapse maps learning topics into a dynamic knowledge graph. Students must demonstrate competency in foundational ideas before unlocking advanced topics.",
    citation: "Bloom, B. S. (1984). The 2 sigma problem: The search for methods of group instruction.",
  },
  {
    id: "retrieval",
    icon: CheckCircle2,
    title: "Retrieval practice",
    subtitle: "Active recall for durable memory retention",
    theory: "The Testing Effect & Spaced Retrieval",
    description:
      "Frequent, low-stakes diagnostic quizzes force students to retrieve information from memory. This strengthens neural pathways and prevents fast forgetting.",
    citation: "Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning.",
  },
  {
    id: "grounded",
    icon: Sparkles,
    title: "Grounded personalization",
    subtitle: "Source-anchored RAG to prevent hallucinations",
    theory: "Sweller's Cognitive Load Theory",
    description:
      "Every tutoring interaction is grounded directly in the teacher's uploaded files (PDFs, lectures). This reduces extraneous cognitive load and guarantees factual truth.",
    citation: "Sweller, J. (1988). Cognitive technology: Some implications for instruction.",
  },
];

export function ResearchInteractive() {
  const [activeTab, setActiveTab] = useState<string>("socratic");

  // State for interactive Retrieval Practice quiz
  const [quizSelected, setQuizSelected] = useState<number | null>(null);

  // Helper for active pillar details
  const activePillar = PILLARS.find((p) => p.id === activeTab) || PILLARS[0];

  return (
    <div className="w-full text-left">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-12 items-stretch">
        
        {/* Left Side: Navigation / Pillar selection */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              const isActive = activeTab === pillar.id;
              
              return (
                <button
                  key={pillar.id}
                  onClick={() => {
                    setActiveTab(pillar.id);
                    // Reset sub-state
                    if (pillar.id !== "retrieval") {
                      setQuizSelected(null);
                    }
                  }}
                  className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                    isActive
                      ? "bg-[#182645] border-[#3b82f6]/45 shadow-lg shadow-blue-950/40"
                      : "bg-[#0f1b35]/40 border-white/5 hover:bg-[#132242]/60 hover:border-white/10"
                  }`}
                >
                  {/* Active Backdrop Glow */}
                  {isActive && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute inset-0 bg-gradient-to-r from-[#3b82f6]/10 to-indigo-500/5 pointer-events-none"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  <div className="flex gap-4 items-start relative z-10">
                    <div
                      className={`p-3 rounded-xl shrink-0 transition-colors duration-300 ${
                        isActive
                          ? "bg-[#3b82f6]/20 text-[#3b82f6]"
                          : "bg-white/5 text-white/55 group-hover:text-white/85"
                      }`}
                    >
                      <Icon className="size-6" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-bold text-[18px] transition-colors duration-300 ${
                            isActive ? "text-white" : "text-white/70 group-hover:text-white"
                          }`}
                        >
                          {pillar.title}
                        </h3>
                        {isActive && (
                          <motion.span
                            layoutId="activeDot"
                            className="size-1.5 rounded-full bg-[#3b82f6]"
                          />
                        )}
                      </div>
                      <p
                        className={`text-[11px] font-semibold mt-0.5 tracking-wide uppercase transition-colors duration-300 ${
                          isActive ? "text-[#3b82f6]" : "text-white/40"
                        }`}
                      >
                        {pillar.theory}
                      </p>
                      <p
                        className={`text-[14px] leading-relaxed mt-2 transition-colors duration-300 ${
                          isActive ? "text-white/80" : "text-white/50"
                        }`}
                      >
                        {pillar.subtitle}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Interactive Simulation Screen */}
        <div className="relative flex flex-col rounded-3xl border border-white/10 bg-[#0e172e] shadow-2xl overflow-hidden min-h-[440px] justify-between">
          {/* Top Bar of the Simulator */}
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-[#0a1124]/80 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500/40" />
                <span className="size-2.5 rounded-full bg-yellow-500/40" />
                <span className="size-2.5 rounded-full bg-green-500/40" />
              </div>
              <span className="text-white/20">|</span>
              <span className="text-[12px] font-mono tracking-wider text-[#3b82f6]/90 uppercase font-semibold">
                EdSynapse Lab Simulation
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono text-white/45 uppercase tracking-wider">
                Live Preview
              </span>
            </div>
          </div>

          {/* Simulator Content Area */}
          <div className="flex-1 p-6 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex flex-col justify-between"
              >
                
                {/* ── SOCRATIC TUTORING SIMULATION ── */}
                {activeTab === "socratic" && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      {/* Message 1: Student */}
                      <div className="self-end max-w-[85%] bg-[#0066cc] text-white text-[14px] px-4 py-3 rounded-2xl rounded-tr-sm shadow-md">
                        <p className="font-semibold text-[11px] text-blue-200 mb-0.5">Student</p>
                        Can you just give me the answer to this limits problem?
                      </div>

                      {/* Message 2: Tutor */}
                      <div className="self-start max-w-[85%] bg-white/5 border border-white/10 text-white/90 text-[14px] px-4 py-3 rounded-2xl rounded-tl-sm shadow-md">
                        <p className="font-semibold text-[11px] text-[#3b82f6] mb-0.5">EdSynapse Socratic Tutor</p>
                        {formatMathText("I can guide you there! Let's examine the numerator first: $x^2 - 9$. If we substitute $x = 3$, what happens?")}
                      </div>

                      {/* Message 3: Student */}
                      <div className="self-end max-w-[85%] bg-[#0066cc] text-white text-[14px] px-4 py-3 rounded-2xl rounded-tr-sm shadow-md">
                        <p className="font-semibold text-[11px] text-blue-200 mb-0.5">Student</p>
                        {formatMathText("It becomes 0 because $3^2 - 9 = 0$. And the denominator is also 0.")}
                      </div>

                      {/* Message 4: Tutor */}
                      <div className="self-start max-w-[85%] bg-white/5 border border-white/10 text-white/90 text-[14px] px-4 py-3 rounded-2xl rounded-tl-sm shadow-md">
                        <p className="font-semibold text-[11px] text-[#3b82f6] mb-0.5">EdSynapse Socratic Tutor</p>
                        {formatMathText("Exactly! A $0/0$ indeterminate form. Now, since we have $x^2 - 9$ in the numerator, how can we factor that to simplify the expression?")}
                      </div>
                    </div>
                    <div className="text-center pt-2">
                      <span className="text-[11px] text-[#3b82f6] bg-[#3b82f6]/10 px-3 py-1 rounded-full font-mono uppercase tracking-wider">
                        Scaffolding Level: Active (Moderate Support)
                      </span>
                    </div>
                  </div>
                )}

                {/* ── MASTERY LEARNING SIMULATION ── */}
                {activeTab === "mastery" && (
                  <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    {/* Visual Knowledge Tree Map */}
                    <div className="flex flex-col items-center w-full max-w-sm">
                      <div className="flex justify-center mb-4">
                        <div className="border-2 border-[#22c55e] bg-[#22c55e]/10 text-white text-[13px] px-4 py-2.5 rounded-xl shadow-lg flex flex-col items-center">
                          <span className="font-bold">Linear Algebra Basics</span>
                          <span className="text-[10px] text-[#22c55e] font-semibold mt-0.5 uppercase tracking-wider">
                            Strong (Mastered)
                          </span>
                        </div>
                      </div>

                      {/* Connecting Lines */}
                      <div className="w-px h-6 bg-gradient-to-b from-[#22c55e] to-[#3b82f6] mb-1" />

                      <div className="grid grid-cols-2 gap-8 w-full relative">
                        {/* Connecting Line Left */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-[#3b82f6] to-[#f59e0b]" />
                        
                        <div className="flex flex-col items-center">
                          <div className="w-1 h-4 bg-[#3b82f6] mb-1" />
                          <div className="border border-[#3b82f6] bg-[#3b82f6]/10 text-white text-[13px] px-4 py-2.5 rounded-xl shadow-md flex flex-col items-center text-center">
                            <span className="font-medium">Vector Spaces</span>
                            <span className="text-[10px] text-[#3b82f6] font-semibold mt-0.5 uppercase tracking-wider">
                              Moderate (Practicing)
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="w-1 h-4 bg-[#f59e0b] mb-1" />
                          <div className="border border-[#f59e0b]/40 bg-white/[0.02] text-white/50 text-[13px] px-4 py-2.5 rounded-xl flex flex-col items-center text-center">
                            <span className="font-medium">Eigenvalues</span>
                            <span className="text-[10px] text-[#f59e0b] font-semibold mt-0.5 uppercase tracking-wider">
                              Needs Focus (Locked)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-[#182645] border border-white/5 rounded-2xl p-4 text-[13px] text-white/70 text-left">
                      <p className="font-semibold text-white mb-1">Adaptive Learning Path:</p>
                      Before the student can attempt <strong className="text-[#f59e0b]">Eigenvalues</strong>, EdSynapse diagnoses a state of <strong className="text-[#f59e0b]">Needs Focus</strong> in foundational topics and guides them through retrieval checks.
                    </div>
                  </div>
                )}

                {/* ── RETRIEVAL PRACTICE SIMULATION ── */}
                {activeTab === "retrieval" && (
                  <div className="space-y-4">
                    <div className="border border-white/10 bg-[#0f1b35] rounded-2xl p-5 shadow-lg">
                      <div className="flex gap-2.5 items-center mb-3">
                        <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                          Active Check-In
                        </span>
                        <span className="text-[12px] text-white/40">Topic: Photosynthesis</span>
                      </div>
                      <p className="text-white text-[15px] font-medium leading-relaxed">
                        What is the primary role of chlorophyll in the light-dependent reactions?
                      </p>

                      <div className="mt-4 space-y-2.5">
                        {[
                          { id: 0, text: "It converts carbon dioxide into glucose." },
                          { id: 1, text: "It absorbs light energy and excites electrons.", correct: true },
                          { id: 2, text: "It splits water molecules to generate carbon." },
                        ].map((opt) => {
                          const isSelected = quizSelected === opt.id;
                          let btnStyle = "border-white/5 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:border-white/10";
                          if (isSelected) {
                            btnStyle = opt.correct
                              ? "border-[#22c55e] bg-[#22c55e]/15 text-[#22c55e]"
                              : "border-red-500/50 bg-red-500/10 text-red-400";
                          }
                          return (
                            <button
                              key={opt.id}
                              disabled={quizSelected !== null}
                              onClick={() => setQuizSelected(opt.id)}
                              className={`w-full text-left p-3 rounded-xl border text-[13.5px] transition-all flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt.text}</span>
                              {isSelected && opt.correct && (
                                <span className="text-[11px] font-semibold bg-[#22c55e]/20 px-2 py-0.5 rounded uppercase tracking-wide">
                                  Correct!
                                </span>
                              )}
                              {isSelected && !opt.correct && (
                                <span className="text-[11px] font-semibold bg-red-500/20 px-2 py-0.5 rounded uppercase tracking-wide">
                                  Incorrect
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {quizSelected !== null && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 text-[12.5px] text-[#22c55e] flex items-center gap-2.5"
                      >
                        <LineChart className="size-4 shrink-0" />
                        <span>
                          <strong>Memory Boost:</strong> Active recall triggers retrieval paths, boosting long-term concept retention by 150% compared to passive rereading.
                        </span>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ── GROUNDED PERSONALIZATION SIMULATION ── */}
                {activeTab === "grounded" && (
                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-[1fr_auto_1.2fr] items-center gap-4">
                      {/* Step 1: Input source */}
                      <div className="border border-white/10 bg-white/[0.03] rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-md">
                        <FileText className="size-8 text-[#3b82f6] mb-2" />
                        <span className="text-[12px] font-semibold text-white/90 truncate max-w-full">
                          Syllabus_Lec3.pdf
                        </span>
                        <span className="text-[10px] text-white/45 mt-1">Authentic Source</span>
                      </div>

                      {/* Vector Store Arrow */}
                      <div className="flex flex-col items-center text-[#3b82f6]">
                        <ChevronRight className="size-6 animate-pulse" />
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-white/30">
                          Embed
                        </span>
                      </div>

                      {/* Step 2: Vector db & LLM context */}
                      <div className="border border-[#3b82f6]/30 bg-[#3b82f6]/5 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-md">
                        <Database className="size-8 text-[#3b82f6] mb-2" />
                        <span className="text-[12px] font-semibold text-white/90">
                          Vector Embeddings
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold mt-1">
                          100% Fact-Grounded
                        </span>
                      </div>
                    </div>

                    <div className="border border-white/5 bg-white/[0.02] rounded-xl p-4 text-left">
                      <div className="flex gap-2 items-center mb-1">
                        <BrainCircuit className="size-4 text-[#3b82f6]" />
                        <span className="text-[12px] font-semibold text-white">Tutor Response Grounding:</span>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-white/70">
                        &ldquo;According to Syllabus_Lec3.pdf, the primary reason for energy dissipation is thermal transfer...&rdquo;{" "}
                        <span className="text-[#3b82f6] font-semibold text-[11px] underline">
                          [Source 1: Syllabus_Lec3.pdf]
                        </span>
                      </p>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
