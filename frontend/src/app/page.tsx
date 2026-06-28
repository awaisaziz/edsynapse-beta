"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap, Quote, Sparkles, MessageSquare, TrendingUp, Check } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { ResearchInteractive } from "@/components/landing/ResearchInteractive";
import { FEEDBACK_URL } from "@/lib/feedback";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";

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
    title: "Publish when ready.",
    body: "Define lesson outlines and organize your topics. Toggle lesson visibility to draft or published so students only learn what is ready.",
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
  {
    step: "05",
    role: "Institution",
    title: "Roll it out across your school.",
    body: "Schools and programs get cohort analytics, course oversight, and admin tools to manage teachers and students — so personalized tutoring scales beyond a single classroom.",
    dark: false,
  },
];



export default function LandingPage() {
  const { scrollY } = useScroll();

  // Hero Parallax
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 0.95]);

  // Scroll Timeline for "How it works"
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: worksScrollY } = useScroll({
    target: howItWorksRef,
    offset: ["start center", "end center"],
  });
  const worksProgress = useSpring(worksScrollY, { stiffness: 100, damping: 30 });
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0066cc]/15 selection:text-[#003f7f]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.96),rgba(245,245,247,0)_68%)]" />

      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <motion.main
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center px-4 pb-12 pt-28 sm:px-6 lg:min-h-[100dvh] lg:px-8 lg:pb-10 lg:pt-24 origin-top"
      >
        <section className="grid w-full items-center gap-10 lg:grid-cols-[1.02fr_1.1fr] lg:gap-12">
          {/* Left — copy */}
          <div className="lg:pr-2">
            <ScrollReveal delay={100} duration={600} direction="up">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-[12.5px] font-semibold text-[#5a6478] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                <Sparkles className="size-3.5 text-[#0066cc]" strokeWidth={2} />
                Personalized learning platform
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200} duration={800} direction="up">
              <h1 className="max-w-[19ch] text-[clamp(2.5rem,5.4vw,4.5rem)] font-bold leading-[0.96] tracking-[-0.035em] text-balance">
                The personalized AI tutor that{" "}
                <span className="bg-gradient-to-r from-[#0066cc] to-[#3b82f6] bg-clip-text text-transparent">
                  adapts
                </span>{" "}
                to your learning style.
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={350} duration={800} direction="up">
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-medium text-[#5a6478]">
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="size-4 text-[#0066cc]" strokeWidth={1.8} />
                  For students, teachers &amp; institutions
                </span>
                <span className="hidden text-[#1d1d1f]/15 sm:inline">·</span>
                <span>6 study formats, grounded in your material</span>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={500} duration={800} direction="up">
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
            </ScrollReveal>
          </div>

          {/* Right — interactive simulator */}
          <div className="flex w-full items-center justify-center">
            <ScrollReveal delay={300} duration={950} direction="up" className="w-full max-w-[650px] lg:max-w-[680px]">
              <InteractiveDemo />
            </ScrollReveal>
          </div>
        </section>
      </motion.main>

      {/* ── HOW IT WORKS (Synapse Staggered Timeline) ────────── */}
      <section id="how-it-works" ref={howItWorksRef} className="relative z-10 w-full pb-32 pt-28 px-6 overflow-hidden">
        {/* Background Watermark Logo */}
        <div className="sticky top-[50vh] left-0 right-0 w-full h-0 z-0 pointer-events-none flex justify-center opacity-[0.015] dark:opacity-[0.03] transition-opacity duration-1000">
          <img src="/logo.png" alt="" className="w-[140vw] max-w-[1400px] h-auto object-contain -translate-y-1/2" />
        </div>

        <div className="mx-auto max-w-4xl relative z-10">
          <div className="text-center mb-20">
            <ScrollReveal direction="up" duration={700}>
              <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold tracking-[-0.035em]">
                How it works
              </h2>
            </ScrollReveal>
          </div>

          <div className="relative pl-8 md:pl-16">
            {/* Vertical timeline track line */}
            <div className="absolute left-[15px] md:left-[24px] top-4 bottom-4 w-[2px] bg-black/5 dark:bg-white/5 rounded-full animate-pulse" />

            {/* Glowing scroll progress line overlay */}
            <motion.div
              style={{ scaleY: worksProgress }}
              className="absolute left-[15px] md:left-[24px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-[#0066cc] to-[#3b82f6] origin-top rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            />

            <div className="flex flex-col gap-12 relative">
              {HOW_IT_WORKS.map((item, index) => (
                <div
                  key={item.step}
                  id={item.step === "01" ? "teachers" : item.step === "03" ? "students" : item.step === "05" ? "institutions" : undefined}
                  className="relative w-full"
                >
                  {/* Staggered Spring Card Pop-up */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 35 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      type: "spring",
                      stiffness: 110,
                      damping: 15,
                      delay: index * 0.05
                    }}
                    className={`w-full py-12 px-8 md:px-12 rounded-[32px] shadow-[0_15px_50px_rgba(0,0,0,0.04)] border transition-all duration-300 ${item.dark
                        ? "bg-[#1d1d1f] text-white border-white/10 shadow-black/20"
                        : "bg-white text-[#1d1d1f] border-black/5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)]"
                      }`}
                  >
                    <div className="flex flex-col md:flex-row items-start gap-6 md:gap-10">
                      {/* step indicator */}
                      <motion.div
                        initial={{ opacity: 0.2, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                        className={`shrink-0 text-[64px] md:text-[80px] font-bold leading-none tracking-[-0.05em] select-none ${item.dark ? "text-white/10" : "text-[#1d1d1f]/10"
                          }`}
                      >
                        {item.step}
                      </motion.div>

                      <div className="pt-1 md:pt-2 text-left">
                        <div className={`mb-3.5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold uppercase tracking-wider ${item.dark
                            ? "border-white/15 text-white/70"
                            : "border-[#1d1d1f]/10 text-[#5b6479] bg-black/[0.02]"
                          }`}>
                          {item.role}
                        </div>
                        <h3 className="text-[clamp(1.5rem,2.5vw,2.2rem)] font-bold leading-[1.1] tracking-[-0.02em]">
                          {item.title}
                        </h3>
                        <p className={`mt-4 max-w-[44ch] text-[17px] leading-8 ${item.dark ? "text-white/70" : "text-[#5a6478]"
                          }`}>
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── EXCELLENCE / LEARNER PHILOSOPHY ──────────────────── */}
      <section className="relative z-10 bg-[#f5f5f7] px-6 py-28">
        <ScrollReveal direction="up" duration={900}>
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-[40px] border border-[#0066cc]/15 bg-gradient-to-br from-[#eaf2ff] via-white to-[#f0f6ff] p-8 md:p-14 lg:p-16 shadow-[0_24px_70px_rgba(0,102,204,0.10)] text-left">

              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">

                {/* Left Side: Philosophy text */}
                <div className="lg:col-span-7 flex flex-col justify-center">
                  <div className="mb-6 self-start inline-flex items-center gap-2 rounded-full border border-[#0066cc]/20 bg-white/70 px-3 py-1.5 text-[12.5px] font-semibold text-[#0066cc] shadow-sm backdrop-blur-xl">
                    <Sparkles className="size-3.5" strokeWidth={2} />
                    The standard we hold you to
                  </div>

                  <blockquote className="text-[clamp(1.6rem,3.4vw,2.5rem)] font-bold leading-[1.22] tracking-[-0.03em] text-[#1d1d1f] text-balance">
                    Excellence is a deeply personal standard of{" "}
                    <span className="bg-gradient-to-r from-[#0066cc] to-[#3b82f6] bg-clip-text text-transparent font-extrabold">
                      continuous growth and mastery
                    </span>{" "}
                    — entirely within your control, and focused on the process over the reward.
                  </blockquote>

                  <p className="mt-6 text-[17px] leading-8 text-[#5a6478] max-w-[50ch]">
                    That belief is what EdSynapse is built on. Your path is yours alone — we measure you
                    against your own progress, not a curve, and celebrate the next step over the final
                    grade.
                  </p>
                </div>

                {/* Right Side: Visualizing the self-comparison curve (Faux Dashboard Mockup) */}
                <div className="lg:col-span-5 w-full">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    className="relative overflow-hidden rounded-[32px] border border-white/60 bg-white/40 p-6 md:p-8 shadow-[0_20px_50px_rgba(29,29,31,0.06)] backdrop-blur-2xl"
                  >
                    {/* Glowing highlight in mockup */}
                    <div className="absolute -right-12 -top-12 size-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between border-b border-black/5 pb-4 mb-6">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-4.5 text-[#0066cc]" strokeWidth={2.5} />
                        <span className="text-[14px] font-bold uppercase tracking-wider text-[#1d1d1f]">
                          Personal Progress Loop
                        </span>
                      </div>
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    <div className="space-y-6">

                      {/* Step 1: Diagnose (Diagnostic Test) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[13px] font-bold">
                          <span className="text-[#5a6478]">1. Diagnose (Diagnostic Test)</span>
                          <span className="text-[#f59e0b] font-mono">Needs Focus (45%)</span>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-black/[0.04] overflow-hidden">
                          <div className="h-full rounded-full bg-[#f59e0b] w-[45%]" />
                        </div>
                      </div>

                      {/* Step 2: Teach & Check (Socratic Dialogue) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[13px] font-bold">
                          <span className="text-[#5a6478]">2. Teach &amp; Check (Socratic Dialogue)</span>
                          <span className="text-[#0066cc] font-mono">Moderate (72%)</span>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-black/[0.04] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#0066cc] to-[#3b82f6] w-[72%]" />
                        </div>
                      </div>

                      {/* Step 3: Verify (Final Assessment) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[13px] font-bold">
                          <span className="text-[#1d1d1f]">3. Verify (Final Assessment)</span>
                          <span className="text-emerald-600 font-mono">Strong (92%)</span>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-black/[0.04] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: "92%" }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                            className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                          />
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-black/5 my-4 pt-4" />

                      {/* Small Callout */}
                      <div className="flex items-center gap-3 bg-[#0066cc]/5 border border-[#0066cc]/10 rounded-2xl p-4">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0066cc] text-white">
                          <Check className="size-3.5" strokeWidth={3} />
                        </div>
                        <p className="text-[12.5px] leading-relaxed font-semibold text-[#1d1d1f]">
                          Compared directly to your own past scores. Celebrating next steps over final grades.
                        </p>
                      </div>
                    </div>

                  </motion.div>
                </div>

              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── RESEARCH / PEDAGOGY (Interactive Lab Showcase) ── */}
      <section id="research" className="relative z-10 bg-[#0a1124] text-white py-28 px-6 overflow-hidden">
        {/* Decorative glowing gradient behind */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="mx-auto w-full max-w-6xl relative z-10">

          <ScrollReveal direction="up" duration={700}>
            <div className="mb-16 md:w-3/5">
              <h2 className="text-[clamp(2.5rem,4.5vw,4rem)] font-bold leading-[1.04] tracking-[-0.03em] text-balance">
                Designed by educators.<br />Backed by research.
              </h2>
              <p className="mt-6 max-w-[50ch] text-[19px] leading-8 text-white/70">
                EdSynapse is built on established learning science — not guesswork. Every part of the
                loop maps to evidence on how people actually learn.
              </p>
            </div>
          </ScrollReveal>

          {/* Interactive Lab Showcase Component */}
          <ScrollReveal direction="up" delay={150} duration={850}>
            <ResearchInteractive />
          </ScrollReveal>

        </div>
      </section>

      {/* ── YOUTUBE VIDEO SHOWCASE ───────────────────────────── */}
      <section className="relative z-10 bg-[#f5f5f7] px-6 pb-20 pt-10">
        <ScrollReveal direction="up" duration={800}>
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10">
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.03em]">
                See EdSynapse in Action
              </h2>
              <p className="mt-4 text-[16px] text-[#5a6478]">
                Watch a quick walkthrough of how EdSynapse transforms study material into a personalized learning loop.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/40 p-4 shadow-[0_20px_50px_rgba(29,29,31,0.05)] backdrop-blur-2xl">
              <div className="aspect-video w-full overflow-hidden rounded-[22px] bg-black shadow-inner">
                <iframe
                  className="h-full w-full border-0"
                  src="https://www.youtube.com/embed/r44k8OVSxTM"
                  title="EdSynapse Walkthrough"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── FOOTER CTA ───────────────────────────────────────── */}
      <section className="relative z-10 bg-[#f5f5f7] py-40 text-center">
        <ScrollReveal direction="up" duration={800}>
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-[clamp(3rem,6vw,5rem)] font-bold leading-[1.02] tracking-[-0.035em]">
              Ready to begin?
            </h2>
            <p className="mt-6 text-[21px] leading-relaxed text-[#5a6478] max-w-[48ch] mx-auto text-balance">
              Set up a classroom in minutes so students can join with a code, or study in a fully personalized version.<br className="hidden md:inline" />
              EdSynapse is currently a free beta phase.
            </p>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="inline-flex h-14 items-center gap-2 rounded-full bg-[#0066cc] px-8 text-[16px] font-semibold text-white transition-all duration-150 hover:bg-[#0071e3] hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/20"
              >
                Sign Up Free
                <ArrowRight className="size-5" strokeWidth={2} />
              </Link>
              <a
                href={FEEDBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 items-center gap-2 rounded-full border border-black/10 bg-white/40 px-8 text-[16px] font-semibold text-[#1d1d1f] backdrop-blur-xl transition-all duration-150 hover:bg-white hover:border-black/20 hover:scale-105 active:scale-95 shadow-[0_4px_30px_rgba(0,0,0,0.03)]"
              >
                <MessageSquare className="size-5 text-[#0066cc]" strokeWidth={2} />
                Give Feedback
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <Footer />
    </div>
  );
}
