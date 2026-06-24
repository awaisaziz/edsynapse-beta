"use client";

import Link from "next/link";
import { ArrowRight, Check, GraduationCap, MessageCircleQuestion, Quote, Sparkles, Target } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";

const HOW_IT_WORKS = [
  {
    step: "01",
    role: "Teacher",
    title: "Upload your material.",
    body: "Drop in PDFs, slides, audio recordings, or lecture videos. EdSynapse reads everything and builds a knowledge base for your class.",
    dark: false,
  },
  {
    step: "02",
    role: "Teacher",
    title: "Choose study modes.",
    body: "Pick which formats your students can access — smart notes, flashcard decks, audio summaries, and mind maps. One toggle per mode.",
    dark: true,
  },
  {
    step: "03",
    role: "Student",
    title: "Tell EdSynapse what to focus on.",
    body: "Students chat with EdSynapse to explain what they want to learn. The AI builds a personalised study guide from your uploaded material.",
    dark: false,
  },
  {
    step: "04",
    role: "Student",
    title: "Study, then prove it.",
    body: "Work through notes, cards, and audio at your own pace. When ready, open the quiz window to test your knowledge and track growth.",
    dark: true,
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0066cc]/15 selection:text-[#003f7f]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.96),rgba(245,245,247,0)_68%)]" />

      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────── */}
      {/* z-20 keeps the hero above the z-10 sections below. The hero is sized to
          fit one viewport on lg+ (headline → CTAs visible without scrolling);
          pt clears the fixed navbar while items-center keeps it balanced. */}
      <main className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center px-4 pb-12 pt-28 sm:px-6 lg:min-h-[100dvh] lg:px-8 lg:pb-10 lg:pt-24">
        <section className="grid w-full items-center gap-10 lg:grid-cols-[1.02fr_1.1fr] lg:gap-12">
          {/* Left — copy */}
          <div className="lg:pr-2">
            {/* Eyebrow — broad category label above the hook headline */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-[12.5px] font-semibold text-[#5a6478] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
              <Sparkles className="size-3.5 text-[#0066cc]" strokeWidth={2} />
              Personalized learning platform
            </div>

            <h1 className="max-w-[15ch] text-[clamp(2.5rem,5.6vw,4.75rem)] font-bold leading-[0.95] tracking-[-0.035em] text-balance">
              Turn course materials{" "}
              <span className="bg-gradient-to-r from-[#0066cc] to-[#3b82f6] bg-clip-text text-transparent">
                into active minds.
              </span>
            </h1>

            <p className="mt-5 max-w-[33rem] text-[17px] leading-relaxed text-[#5a6478] sm:text-[18px]">
              A personalized Socratic AI tutor that grounds every lesson in your own material —
              and checks understanding as it teaches, adapting to how each learner learns best.
            </p>

            {/* Slim audience strip — broad reach, minimal vertical footprint */}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-medium text-[#5a6478]">
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="size-4 text-[#0066cc]" strokeWidth={1.8} />
                For students, teachers &amp; institutions
              </span>
              <span className="hidden text-[#1d1d1f]/15 sm:inline">·</span>
              <span>6 study formats, grounded in your material</span>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0066cc] px-7 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(0,102,204,0.28)] transition-all duration-150 hover:bg-[#0071e3] active:scale-[0.97]"
              >
                Sign Up Free
                <ArrowRight className="size-4" strokeWidth={1.8} />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[#1d1d1f]/15 bg-white/60 px-6 text-[15px] font-semibold text-[#1d1d1f] backdrop-blur-xl transition-all duration-150 hover:bg-white active:scale-[0.97]"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Right — interactive simulator */}
          <div className="flex w-full items-center justify-center">
            <div className="w-full max-w-[560px]">
              <InteractiveDemo />
            </div>
          </div>
        </section>
      </main>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10">
        {HOW_IT_WORKS.map((item) => (
          <div
            key={item.step}
            id={item.step === "01" ? "teachers" : item.step === "03" ? "students" : undefined}
            className={`w-full py-24 px-6 scroll-mt-24 ${item.dark ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}
          >
            <div className="mx-auto max-w-4xl">
              <div className="flex items-start gap-8">
                <div className={`shrink-0 text-[80px] font-semibold leading-none tracking-[-0.04em] ${item.dark ? "text-white/10" : "text-[#1d1d1f]/10"}`}>
                  {item.step}
                </div>
                <div className="pt-3">
                  <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium ${item.dark ? "border-white/15 text-white/50" : "border-[#1d1d1f]/12 text-[#6e6e73]"}`}>
                    {item.role}
                  </div>
                  <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
                    {item.title}
                  </h2>
                  <p className={`mt-4 max-w-[42ch] text-[19px] leading-8 ${item.dark ? "text-white/60" : "text-[#6e6e73]"}`}>
                    {item.body}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── EXCELLENCE / LEARNER PHILOSOPHY ──────────────────── */}
      {/* Caps the student journey with the standard EdSynapse holds learners to. */}
      <section className="relative z-10 bg-[#f5f5f7] px-6 py-28">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-[32px] border border-[#0066cc]/15 bg-gradient-to-br from-[#eaf2ff] via-white to-[#f0f6ff] px-8 py-14 shadow-[0_24px_70px_rgba(0,102,204,0.10)] sm:px-14">
            <Quote
              className="pointer-events-none absolute -right-4 -top-2 size-40 text-[#0066cc]/[0.06]"
              strokeWidth={1}
            />
            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0066cc]/20 bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-[#0066cc] shadow-sm backdrop-blur-xl">
                <Sparkles className="size-3.5" strokeWidth={2} />
                The standard we hold you to
              </div>

              <blockquote className="max-w-[24ch] text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold leading-[1.18] tracking-[-0.02em] text-[#1d1d1f] text-balance">
                Excellence is a deeply personal standard of{" "}
                <span className="bg-gradient-to-r from-[#0066cc] to-[#3b82f6] bg-clip-text text-transparent">
                  continuous growth and mastery
                </span>{" "}
                — entirely within your control, and focused on the process over the reward.
              </blockquote>

              <p className="mt-7 max-w-[54ch] text-[17px] leading-8 text-[#5a6478]">
                That belief is what EdSynapse is built on. Your path is yours alone — we measure you
                against your own progress, not a curve, and celebrate the next step over the final
                grade.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INSTITUTIONS ─────────────────────────────────────── */}
      <section id="institutions" className="relative z-10 scroll-mt-24 bg-[#f5f5f7] py-24 px-6 text-[#1d1d1f]">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-start gap-8">
            <div className="shrink-0 text-[80px] font-semibold leading-none tracking-[-0.04em] text-[#1d1d1f]/10">
              05
            </div>
            <div className="pt-3">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#1d1d1f]/12 px-3 py-1 text-[12px] font-medium text-[#6e6e73]">
                Institution
              </div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
                Roll it out across your school.
              </h2>
              <p className="mt-4 max-w-[42ch] text-[19px] leading-8 text-[#6e6e73]">
                Schools and programs get cohort analytics, course oversight, and admin tools to
                manage teachers and students — so personalized tutoring scales beyond a single
                classroom.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── RESEARCH / PEDAGOGY ──────────────────────────────── */}
      <section id="research" className="relative z-10 scroll-mt-24 bg-[#1d1d1f] py-28 px-6 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-[clamp(2.25rem,4.5vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.025em]">
            Designed by educators. Backed by research.
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-[19px] leading-8 text-white/60">
            EdSynapse is built on established learning science — not guesswork. Every part of the
            loop maps to evidence on how people actually learn.
          </p>

          <div className="mt-14 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: MessageCircleQuestion,
                title: "Socratic tutoring",
                body: "The AI tutor guides with questions and scaffolds toward answers instead of handing them over.",
              },
              {
                icon: Target,
                title: "Mastery learning",
                body: "Diagnose gaps first, then teach and re-check until the concept is genuinely understood.",
              },
              {
                icon: Check,
                title: "Retrieval practice",
                body: "Frequent low-stakes checks turn studying into active recall, the way memory is built to stick.",
              },
              {
                icon: Sparkles,
                title: "Grounded & personalized",
                body: "Lessons are grounded in your own material and adapt to each learner's pace and preferences.",
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-[20px] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm"
              >
                <pillar.icon className="size-5 text-[#5aa9ff]" strokeWidth={1.8} />
                <h3 className="mt-3 text-[15px] font-semibold">{pillar.title}</h3>
                <p className="mt-2 text-[13px] leading-5 text-white/55">{pillar.body}</p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-12 max-w-[52ch] text-[13px] leading-6 text-white/40">
            Developed with input from active research in AI for education, drawing on the learning
            sciences — mastery learning, the testing effect, and worked-example and
            scaffolding theory.
          </p>
        </div>
      </section>

      {/* ── FOOTER CTA ───────────────────────────────────────── */}
      <section className="relative z-10 bg-[#f5f5f7] py-32 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.025em]">
            Ready to get started?
          </h2>
          <p className="mt-5 text-[19px] leading-8 text-[#6e6e73]">
            Set up a classroom in minutes. Students join with a code. EdSynapse is currently a free
            beta released for testing — no cost to try.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0066cc] px-7 text-[15px] font-medium text-white transition-all duration-150 hover:bg-[#0071e3] active:scale-[0.97]"
            >
              Sign Up Free
              <ArrowRight className="size-4" strokeWidth={1.8} />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-[#1d1d1f]/15 bg-white/60 px-7 text-[15px] font-medium text-[#1d1d1f] backdrop-blur-xl transition-all duration-150 hover:bg-white active:scale-[0.97]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
