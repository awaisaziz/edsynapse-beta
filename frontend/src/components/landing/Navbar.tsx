import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { FEEDBACK_URL } from "@/lib/feedback";

interface NavbarProps {
  variant?: "light" | "dark" | "glass";
}

/**
 * Public marketing navbar (landing, sign-in, sign-up, legal pages). Intentionally
 * has NO auth awareness: it never reads the session or calls /api/auth/me, so the
 * public pages stay fully static and auth only ever happens once the user signs
 * in / up. The in-app navigation (AppShell) handles the signed-in experience.
 */
export function Navbar({ variant = "glass" }: NavbarProps) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-6">
      <div
        className={cn(
          "mx-auto flex h-14 max-w-[1440px] items-center justify-between rounded-full px-4 backdrop-blur-2xl shadow-sm transition-all duration-300",
          variant === "glass"
            ? "border border-white/70 bg-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_60px_rgba(29,29,31,0.08)]"
            : variant === "dark"
            ? "border border-white/10 bg-zinc-950/80 text-white"
            : "border border-black/5 bg-white/95 text-foreground"
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 pl-1">
          <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg">
            <Image
              src="/logo.png"
              alt="EdSynapse Logo"
              fill
              sizes="32px"
              priority
              className="object-contain dark:hidden"
            />
            <Image
              src="/logo-dark.png"
              alt="EdSynapse Logo"
              fill
              sizes="32px"
              priority
              className="hidden object-contain dark:block"
            />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground font-display">
            EdSynapse
          </span>
          <span className="ml-2 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            Beta version
          </span>
        </Link>

        {/* Center nav links */}
        <div className="hidden items-center gap-6 text-xs font-bold text-muted-foreground md:flex">
          <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/#teachers" className="transition-colors hover:text-foreground">
            Teachers
          </Link>
          <Link href="/#students" className="transition-colors hover:text-foreground">
            Students
          </Link>
          <Link href="/#institutions" className="transition-colors hover:text-foreground">
            Institution
          </Link>
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Feedback
          </a>
        </div>

        {/* Public CTAs — always Sign in / Sign up; no session awareness here. */}
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="flex h-9 items-center gap-1.5 rounded-full border border-primary/10 bg-white/70 px-4 text-xs font-bold text-primary transition-all duration-150 hover:bg-white active:scale-[0.97]"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-white transition-all duration-150 hover:bg-primary/95 active:scale-[0.97] shadow-lg shadow-primary/20"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}
