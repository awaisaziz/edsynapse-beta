import React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

interface LegalShellProps {
  title: string;
  /** Short line under the title, e.g. an effective date or one-line summary. */
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Page chrome for the public company/legal pages (About, Terms, Privacy,
 * Contact). Wraps content in the same Navbar + Footer as the landing page and
 * applies a readable prose column.
 */
export function LegalShell({ title, subtitle, children }: LegalShellProps) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0066cc]/15 selection:text-[#003f7f]">
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.96),rgba(245,245,247,0)_68%)]" />

      <Navbar />

      <main className="relative z-20 mx-auto w-full max-w-3xl px-6 pb-24 pt-32 sm:px-8">
        <header className="mb-12">
          <h1 className="text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
            {title}
          </h1>
          {subtitle && <p className="mt-3 text-[16px] leading-7 text-[#6e6e73]">{subtitle}</p>}
        </header>

        <div className="legal-prose space-y-6 text-[16px] leading-7 text-[#424245]">{children}</div>
      </main>

      <Footer />
    </div>
  );
}

/** Section heading used inside legal/company prose. */
export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="pt-4 text-[22px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">{heading}</h2>
      {children}
    </section>
  );
}
