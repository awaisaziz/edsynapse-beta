"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, X, CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { cn } from "@/lib/utils";
import { resetPassword } from "@/lib/useAuth";

// Mirrors validatePassword() in src/lib/auth.ts.
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "A letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "A number", test: (p: string) => /[0-9]/.test(p) },
  { label: "A special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const passwordValid = useMemo(() => PASSWORD_RULES.every((r) => r.test(password)), [password]);
  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = Boolean(token) && passwordValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/sign-in"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0066cc]/15">
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.96),rgba(245,245,247,0)_68%)]" />
      <Navbar />

      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-24">
        <div className="w-full max-w-md">
          <h1 className="mb-2 text-center text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">
            New password.
          </h1>
          <p className="mb-10 text-center text-[17px] text-[#6e6e73]">Choose a strong new password.</p>

          <div className="liquid-shell rounded-[34px] p-3">
            <div className="rounded-[26px] border border-white/70 bg-[#fbfbfd]/76 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
              {done ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">Password updated</p>
                  <p className="text-[13px] text-[#6e6e73]">Redirecting you to sign in…</p>
                </div>
              ) : !token ? (
                <div className="py-6 text-center text-[13px] text-[#6e6e73]">
                  This reset link is missing its token. Please request a new one from{" "}
                  <Link href="/forgot-password" className="text-[#0066cc] hover:underline">
                    Forgot password
                  </Link>
                  .
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {error && (
                    <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-600">
                      {error}
                    </div>
                  )}
                  <div className="rounded-[18px] border border-[#1d1d1f]/10 bg-white/82 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition focus-within:border-[#0066cc]/45 focus-within:ring-4 focus-within:ring-[#0066cc]/10">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password"
                      className="h-12 w-full bg-transparent text-[17px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                      required
                    />
                  </div>

                  {password.length > 0 && (
                    <ul className="grid grid-cols-2 gap-1.5 px-1">
                      {PASSWORD_RULES.map((rule) => {
                        const ok = rule.test(password);
                        return (
                          <li
                            key={rule.label}
                            className={cn(
                              "flex items-center gap-1.5 text-[12px] font-medium",
                              ok ? "text-emerald-600" : "text-[#86868b]",
                            )}
                          >
                            {ok ? <Check className="size-3.5" strokeWidth={2.5} /> : <X className="size-3.5" strokeWidth={2.5} />}
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div
                    className={cn(
                      "rounded-[18px] border bg-white/82 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition focus-within:ring-4 focus-within:ring-[#0066cc]/10",
                      confirm.length > 0 && !passwordsMatch
                        ? "border-rose-300 focus-within:border-rose-400"
                        : "border-[#1d1d1f]/10 focus-within:border-[#0066cc]/45",
                    )}
                  >
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Confirm new password"
                      className="h-12 w-full bg-transparent text-[17px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                      required
                    />
                  </div>
                  {confirm.length > 0 && !passwordsMatch && (
                    <p className="px-1 text-[12px] font-medium text-rose-500">Passwords don&apos;t match.</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !canSubmit}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0066cc] text-[15px] font-medium text-white transition-all duration-150 hover:bg-[#0071e3] active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        Update password
                        <ArrowRight className="size-4" strokeWidth={1.8} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
