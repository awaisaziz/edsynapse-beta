"use client";

import React, { useState, useEffect } from "react";
import { 
  Zap, FileText, Layers, Volume2, Network, Check, Sparkles, 
  Upload, ArrowRight, BookOpen, UserCheck, RefreshCw, BarChart2, ShieldAlert
} from "lucide-react";

type Tab = "ingest" | "tutor" | "analytics";

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<Tab>("ingest");
  const [sceneStep, setSceneStep] = useState(0);

  // Auto-play the steps of each scene loop
  useEffect(() => {
    setSceneStep(0);
    const interval = setInterval(() => {
      setSceneStep((prev) => (prev + 1) % 6);
    }, 3200); // Advance step every 3.2 seconds for readability
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="w-full">
      {/* Tab controls */}
      <div className="mb-4 flex items-center justify-between gap-2 rounded-full border border-white/60 bg-white/45 p-1.5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-1 gap-1.5">
          <button
            onClick={() => setActiveTab("ingest")}
            className={`flex-1 cursor-pointer rounded-full px-4 py-3 text-[13px] font-bold tracking-tight transition-all md:text-[15px] ${
              activeTab === "ingest"
                ? "bg-[#0066cc] text-white shadow-[0_4px_12px_rgba(0,102,204,0.25)]"
                : "text-[#6e6e73] hover:bg-white/50"
            }`}
          >
            1. Smart Ingest
          </button>
          <button
            onClick={() => setActiveTab("tutor")}
            className={`flex-1 cursor-pointer rounded-full px-4 py-3 text-[13px] font-bold tracking-tight transition-all md:text-[15px] ${
              activeTab === "tutor"
                ? "bg-[#0066cc] text-white shadow-[0_4px_12px_rgba(0,102,204,0.25)]"
                : "text-[#6e6e73] hover:bg-white/50"
            }`}
          >
            2. Socratic Tutor
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 cursor-pointer rounded-full px-4 py-3 text-[13px] font-bold tracking-tight transition-all md:text-[15px] ${
              activeTab === "analytics"
                ? "bg-[#0066cc] text-white shadow-[0_4px_12px_rgba(0,102,204,0.25)]"
                : "text-[#6e6e73] hover:bg-white/50"
            }`}
          >
            3. Classroom Insights
          </button>
        </div>
      </div>

      {/* Main simulator card shell */}
      <div className="liquid-shell relative min-h-[460px] overflow-hidden rounded-[34px] p-6 transition-all duration-300">
        
        {/* ─── TAB 1: SMART INGEST (THE ENGINE) ─── */}
        {activeTab === "ingest" && (
          <div className="relative flex flex-col h-full edsynapse-stagger text-left">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between border-b border-[#1d1d1f]/5 pb-3.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e6e73]">Stage 01 — Grounded Engine</span>
                <h2 className="text-[19px] font-bold tracking-tight text-slate-900">Ingesting Syllabus Material</h2>
              </div>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-bold text-[#0066cc] animate-pulse">
                Parsing & Embedding...
              </span>
            </div>

            {/* Content split grid */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-4 flex-1">
              {/* Left Column: Simulated Upload progress */}
              <div className="bg-white/80 border border-[#1d1d1f]/5 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[220px]">
                <div>
                  <p className="text-[10px] font-bold text-[#6e6e73] uppercase tracking-wider mb-2">Classroom Ingest Pool:</p>
                  
                  {/* File 1: Campbell Biology */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs shadow-sm space-y-1.5 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-800 break-all">ap_biology_chapter_10_photosynthesis.pdf</span>
                      {sceneStep === 0 && <span className="text-[9px] font-black text-[#0066cc] animate-pulse">Queued</span>}
                      {sceneStep === 1 && <span className="text-[9px] font-black text-amber-600 animate-pulse">45% Ingesting</span>}
                      {sceneStep >= 2 && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Indexed</span>}
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`bg-[#0066cc] h-full transition-all duration-700 ${
                          sceneStep === 0 ? "w-0" : sceneStep === 1 ? "w-[45%]" : "w-full"
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-[#6e6e73]">
                      <span>2.4 MB</span>
                      <span>
                        {sceneStep === 0 && "Waiting..."}
                        {sceneStep === 1 && "Chunking syllabus content..."}
                        {sceneStep >= 2 && "Finished indexing (128 vectors)"}
                      </span>
                    </div>
                  </div>

                  {/* Syllabus concept scrape message */}
                  <div className="mt-3 bg-[#0066cc]/5 border border-[#0066cc]/10 rounded-xl p-3 text-[11px] text-[#5a6478] leading-relaxed transition-all">
                    {sceneStep < 2 ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="size-3.5 text-[#0066cc] animate-spin shrink-0" />
                        Analyzing hierarchy... extracting syllabus concepts.
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 edsynapse-stagger font-medium text-slate-800">
                        <Sparkles className="size-3.5 text-[#0066cc] shrink-0" />
                        Extracted: <strong>Light Reactions, Calvin Cycle, Photolysis</strong>.
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-medium italic border-t pt-2 mt-2">
                  {sceneStep < 2 ? "⏳ Preparing system files..." : "✅ Indexed files mapping to database."}
                </div>
              </div>

              {/* Right Column: Simulated Vector DB Scatter */}
              <div className="relative border border-dashed border-[#1d1d1f]/10 rounded-2xl bg-white/70 p-3 flex flex-col justify-between overflow-hidden min-h-[220px]">
                <div>
                  <p className="text-[10px] font-bold text-[#6e6e73] uppercase tracking-wider">AWS Aurora pgvector Space:</p>
                  <p className="text-[9px] text-[#6e6e73] leading-snug">Semantic index matches students' questions to source paragraphs in milliseconds.</p>
                </div>
                
                {/* SVG Coordinate mapping animation */}
                <div className="relative flex-1 flex items-center justify-center py-2">
                  <svg className="w-full h-full max-h-[140px] max-w-[240px]" viewBox="0 0 200 100">
                    <line x1="0" y1="90" x2="200" y2="90" stroke="#e2e8f0" strokeWidth="1" />
                    <line x1="10" y1="0" x2="10" y2="100" stroke="#e2e8f0" strokeWidth="1" />
                    
                    {/* Background grid dots */}
                    <circle cx="40" cy="30" r="1.5" fill="#cbd5e1" />
                    <circle cx="80" cy="70" r="1.5" fill="#cbd5e1" />
                    <circle cx="120" cy="20" r="1.5" fill="#cbd5e1" />
                    <circle cx="160" cy="50" r="1.5" fill="#cbd5e1" />

                    {/* Grounded coordinate connections */}
                    {sceneStep >= 3 && (
                      <g className="edsynapse-stagger">
                        <line x1="50" y1="65" x2="90" y2="40" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="90" y1="40" x2="140" y2="75" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="140" y1="75" x2="160" y2="25" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" />
                      </g>
                    )}

                    {/* Vector Node A: Chlorophyll */}
                    {sceneStep >= 2 && (
                      <g className="edsynapse-stagger cursor-help">
                        <circle cx="50" cy="65" r="5" fill="#0066cc" />
                        <circle cx="50" cy="65" r="8" stroke="#0066cc" strokeWidth="1" fill="none" className="animate-ping opacity-35" />
                        <text x="50" y="55" textAnchor="middle" className="text-[7px] font-black text-slate-800">Chlorophyll</text>
                      </g>
                    )}

                    {/* Vector Node B: PSII */}
                    {sceneStep >= 3 && (
                      <g className="edsynapse-stagger">
                        <circle cx="90" cy="40" r="5" fill="#0066cc" />
                        <text x="90" y="30" textAnchor="middle" className="text-[7px] font-black text-slate-800">Photosystem II</text>
                      </g>
                    )}

                    {/* Vector Node C: Photolysis */}
                    {sceneStep >= 3 && (
                      <g className="edsynapse-stagger">
                        <circle cx="140" cy="75" r="5" fill="#0066cc" />
                        <text x="140" y="87" textAnchor="middle" className="text-[7px] font-black text-slate-800">Photolysis</text>
                      </g>
                    )}

                    {/* Vector Node D: ATP Synthase */}
                    {sceneStep >= 4 && (
                      <g className="edsynapse-stagger">
                        <circle cx="160" cy="25" r="5" fill="#1e3a8a" />
                        <text x="160" y="18" textAnchor="middle" className="text-[7px] font-black text-slate-800">ATP Synthase</text>
                      </g>
                    )}
                  </svg>
                </div>

                <div className="bg-[#f0f6ff] text-[#0066cc] border border-blue-100 rounded-lg p-2 text-[10px] font-medium leading-relaxed">
                  {sceneStep < 2 && "💡 Indexing splits paragraphs into numerical coordinates based on similarity."}
                  {sceneStep >= 2 && sceneStep < 4 && "💡 Semantic vectors uploaded. Ready to map logical connections."}
                  {sceneStep >= 4 && "💡 Success: Syllabus indexed into the class link knowledge graph."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: SOCRATIC TUTOR (THE STUDENT) ─── */}
        {activeTab === "tutor" && (
          <div className="relative flex flex-col h-full edsynapse-stagger text-left">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between border-b border-[#1d1d1f]/5 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e6e73]">Stage 02 — Student View</span>
                <h2 className="text-[17px] font-bold tracking-tight text-slate-900">Personalized Socratic Dialogue</h2>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 animate-pulse">
                Active Study Session
              </span>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-4 flex-1">
              
              {/* Left Column: Simulated Socratic Chat */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 shadow-inner flex flex-col justify-between min-h-[260px]">
                <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1 chat-scroll">
                  {/* Tutor Question */}
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0066cc]/10 text-[#0066cc]">
                      <Zap className="size-3" strokeWidth={2} />
                    </div>
                    <div className="rounded-[18px] rounded-tl-sm border border-[#1d1d1f]/5 bg-white px-3 py-2 text-[12.5px] leading-relaxed shadow-sm">
                      Hi Awais! Let's diagnostic-check: <strong>where do the light-dependent reactions of photosynthesis occur?</strong>
                    </div>
                  </div>

                  {/* Student Wrong Answer */}
                  {sceneStep >= 1 && (
                    <div className="flex items-start gap-2 justify-end edsynapse-stagger">
                      <div className="rounded-[18px] rounded-tr-sm bg-[#0066cc] px-3.5 py-2 text-[12.5px] leading-relaxed text-white shadow-md max-w-[85%]">
                        I think they occur in the stroma fluid?
                      </div>
                    </div>
                  )}

                  {/* Tutor Socratic Guidance & Citation */}
                  {sceneStep >= 2 && (
                    <div className="flex items-start gap-2 edsynapse-stagger">
                      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0066cc]/10 text-[#0066cc]">
                        <Zap className="size-3" strokeWidth={2} />
                      </div>
                      <div className="rounded-[18px] rounded-tl-sm border border-[#1d1d1f]/5 bg-white px-3 py-2 text-[12.5px] leading-relaxed shadow-sm space-y-2">
                        <p>
                          💡 The stroma is where carbon fixation (Calvin cycle) happens. Light reactions need to pump protons across a membrane to charge chemical energy. 
                          Check page 142 of your textbook guide on the right!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Student Correct Answer */}
                  {sceneStep >= 3 && (
                    <div className="flex items-start gap-2 justify-end edsynapse-stagger">
                      <div className="rounded-[18px] rounded-tr-sm bg-[#0066cc] px-3.5 py-2 text-[12.5px] leading-relaxed text-white shadow-md max-w-[85%]">
                        Ah! They occur in the thylakoid membranes!
                      </div>
                    </div>
                  )}

                  {/* Tutor Confirmation */}
                  {sceneStep >= 4 && (
                    <div className="flex items-start gap-2 edsynapse-stagger">
                      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0066cc]/10 text-[#0066cc]">
                        <Zap className="size-3" strokeWidth={2} />
                      </div>
                      <div className="rounded-[18px] rounded-tl-sm border border-[#1d1d1f]/5 bg-white px-3 py-2 text-[12.5px] leading-relaxed shadow-sm">
                        🎉 <strong>Spot on!</strong> Chlorophyll captures photons within the thylakoid membrane, initiating electron transport.
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#1d1d1f]/5 pt-2 mt-2 flex items-center justify-between text-[9px] text-[#6e6e73] font-mono">
                  <span>Student Profile: Visual / Deep</span>
                  <span>Socratic Loop active</span>
                </div>
              </div>

              {/* Right Column: Synced Study card highlights */}
              <div className="bg-white border border-[#1d1d1f]/5 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[260px]">
                
                {/* Visual indicator of the Study format preview */}
                <div className="flex-1 flex flex-col justify-center">
                  
                  {/* Case 1: Smart Notes highlight on wrong answer */}
                  {sceneStep <= 2 && (
                    <div className="space-y-2 text-left edsynapse-stagger text-[11px] leading-relaxed">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="font-bold text-[#1d1d1f] flex items-center gap-1">
                          <BookOpen className="size-3.5 text-[#0066cc]" />
                          Smart Notes Guide
                        </span>
                        <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                          Citation Target
                        </span>
                      </div>
                      
                      <p className="text-slate-800">
                        Photosynthesis takes place in two phases:
                      </p>
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        sceneStep === 2 ? "bg-amber-50 border-l-2 border-amber-500 scale-[1.01] shadow-sm font-semibold" : "bg-slate-50 border"
                      }`}>
                        <strong>1. Light Reactions:</strong> Occur within the <span className={sceneStep === 2 ? "underline decoration-[#0066cc]" : ""}>thylakoid membranes</span>, splitting water to release O2 and store ATP/NADPH.
                      </div>
                      <div className="p-2 border rounded-xl bg-slate-50 text-slate-400">
                        <strong>2. Calvin Cycle:</strong> Occurs in the stroma fluid, fixing carbon dioxide into carbohydrates.
                      </div>
                    </div>
                  )}

                  {/* Case 2: Flashcards update on correct answer */}
                  {sceneStep >= 3 && (
                    <div className="flex flex-col items-center justify-center p-1 edsynapse-stagger">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#6e6e73] mb-3">
                        <Layers className="size-3.5 text-[#0066cc]" />
                        <span>Interactive Flashcard Flip</span>
                      </div>

                      {/* Card wrapper */}
                      <div className="w-full max-w-[200px] h-[110px] perspective">
                        <div className={`relative w-full h-full duration-500 transform-style preserve-3d ${
                          sceneStep >= 4 ? "rotate-y-180" : ""
                        }`}>
                          {/* Front */}
                          <div className="absolute inset-0 w-full h-full rounded-2xl border border-blue-100 bg-[#f0f6ff]/60 flex flex-col justify-between p-3 backface-hidden shadow-sm">
                            <span className="text-[8px] uppercase tracking-wider font-bold text-[#0066cc]">Light Reactions</span>
                            <p className="text-[11px] font-bold text-slate-800 text-center leading-snug">
                              Where are photons captured and water split?
                            </p>
                            <span className="text-[8px] text-right text-slate-400">Flipping...</span>
                          </div>

                          {/* Back */}
                          <div className="absolute inset-0 w-full h-full rounded-2xl border border-emerald-100 bg-emerald-50/70 flex flex-col justify-between p-3 backface-hidden transform rotate-y-180 shadow-sm">
                            <span className="text-[8px] uppercase tracking-wider font-bold text-emerald-700">Answer</span>
                            <p className="text-[12px] font-black text-slate-900 text-center leading-snug">
                              Thylakoid Membrane
                            </p>
                            <span className="text-[8px] text-right text-emerald-700 font-bold">Concept Mastered</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Bottom stats update */}
                <div className="mt-3 border-t border-[#1d1d1f]/5 pt-2 flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-500">Knowledge Index:</span>
                  <span className={`transition-colors duration-300 ${
                    sceneStep >= 3 ? "text-emerald-600" : "text-amber-600"
                  }`}>
                    {sceneStep < 3 ? "Photosynthesis: 45%" : "Photosynthesis: 90% (Mastered)"}
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─── TAB 3: MASTERY ANALYTICS (THE TEACHER) ─── */}
        {activeTab === "analytics" && (
          <div className="relative flex flex-col h-full edsynapse-stagger text-left">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between border-b border-[#1d1d1f]/5 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e6e73]">Stage 03 — Teacher Dashboard</span>
                <h2 className="text-[17px] font-bold tracking-tight text-slate-900">Cohort Insights & Adaptive Review</h2>
              </div>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 animate-pulse">
                Active Classroom Insights
              </span>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-4 flex-1">
              
              {/* Left Column: Student Roster Live Progress */}
              <div className="bg-white/80 border border-[#1d1d1f]/5 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[240px]">
                <div>
                  <p className="text-[10px] font-bold text-[#6e6e73] uppercase tracking-wider mb-2">Classroom Roster:</p>
                  
                  <div className="space-y-2">
                    {/* Student 1: Liam */}
                    <div className="bg-slate-50 border rounded-xl p-2.5 text-xs shadow-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <UserCheck className="size-3.5 text-slate-400" />
                          Liam O.
                        </span>
                        <span className={`text-[9px] font-bold ${
                          sceneStep >= 1 ? "text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded" : "text-amber-700 animate-pulse"
                        }`}>
                          {sceneStep === 0 ? "Diagnosing..." : "Mastery check complete"}
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`bg-indigo-600 h-full transition-all duration-700 ${
                            sceneStep === 0 ? "w-[40%]" : "w-[85%]"
                          }`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-[#6e6e73]">
                        <span>Diagnostic progress</span>
                        <span className="font-bold">{sceneStep === 0 ? "40% index" : "85% index (Strong)"}</span>
                      </div>
                    </div>

                    {/* Student 2: Sarah */}
                    <div className="bg-slate-50 border rounded-xl p-2.5 text-xs shadow-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <UserCheck className="size-3.5 text-emerald-500" />
                          Sarah K.
                        </span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                          Mastered Unit
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full w-[95%]" />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-[#6e6e73]">
                        <span>Diagnostic progress</span>
                        <span className="font-bold">95% index (Strong)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-medium italic border-t pt-2 mt-2">
                  Live scores update cohort graphs dynamically.
                </div>
              </div>

              {/* Right Column: Class aggregated map & Action */}
              <div className="bg-white border border-[#1d1d1f]/5 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[240px]">
                
                {/* Chart & Action Overlay */}
                <div className="space-y-3 relative flex-1 flex flex-col justify-between">
                  
                  {/* Topic map */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-[#6e6e73] uppercase tracking-wider flex items-center gap-1">
                      <BarChart2 className="size-3.5 text-indigo-600" />
                      Class Mastery Gap:
                    </p>
                    
                    {/* Topic 1 bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-medium">
                        <span>☀️ Light-dependent Reactions</span>
                        <span className="font-bold text-[#1d1d1f]">88% mastery</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full w-[88%]" />
                      </div>
                    </div>

                    {/* Topic 2 bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-medium">
                        <span>🧪 Calvin Cycle (Dark Reactions)</span>
                        <span className={`font-bold transition-colors duration-300 ${
                          sceneStep >= 2 ? "text-indigo-600" : "text-rose-500"
                        }`}>
                          {sceneStep < 2 ? "42% mastery" : "68% mastery"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-700 ${
                            sceneStep < 2 ? "bg-rose-500 w-[42%]" : "bg-indigo-600 w-[68%]"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Teacher trigger action simulation */}
                  <div className="pt-2">
                    {sceneStep < 3 ? (
                      <button 
                        className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          sceneStep === 2 
                            ? "bg-amber-500 text-white border-transparent shadow-[0_4px_12px_rgba(245,158,11,0.25)] animate-pulse"
                            : "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        <ShieldAlert className="size-3.5" />
                        {sceneStep === 2 ? "Cohort Alert: Generate Review Material" : "Cohort Status Normal"}
                      </button>
                    ) : (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[11px] text-[#1e3a8a] edsynapse-stagger leading-relaxed space-y-1 text-center">
                        <p className="font-bold flex items-center justify-center gap-1">
                          <Sparkles className="size-3.5 text-indigo-600 animate-spin" />
                          Adaptive Material Sent!
                        </p>
                        <p className="text-[10px] text-slate-600">
                          Socratic flashcards and video review study guides targeted at <strong>Calvin Cycle</strong> dispatched to all students.
                        </p>
                      </div>
                    )}
                  </div>

                </div>

                {/* Bottom loop info */}
                <div className="mt-3 border-t border-[#1d1d1f]/5 pt-2 text-[10px] text-center text-slate-400">
                  {sceneStep < 2 && "Analyzing cohort diagnostics..."}
                  {sceneStep === 2 && "Class deficit found. Dispatching corrective triggers..."}
                  {sceneStep >= 3 && "Adaptive loop complete. Waiting for student updates."}
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
