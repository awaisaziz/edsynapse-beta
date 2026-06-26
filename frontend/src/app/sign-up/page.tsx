"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, GraduationCap, User, Check, X, MailCheck } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { cn } from "@/lib/utils";
import { register, resendVerification } from "@/lib/useAuth";

// Password policy — kept in sync with validatePassword() in src/lib/auth.ts.
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "A letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "A number", test: (p: string) => /[0-9]/.test(p) },
  { label: "A special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function SignUpPage() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState(false);

  const passwordValid = useMemo(() => PASSWORD_RULES.every((r) => r.test(password)), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit =
    firstName.trim() !== "" && lastName.trim() !== "" && email.trim() !== "" && passwordValid && passwordsMatch;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        role,
      });
      // Account created but not active yet — the user must confirm their email
      // before they can sign in. Show the "check your inbox" screen.
      setSent(true);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    await resendVerification(email.trim());
    setResent(true);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0066cc]/15">
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.96),rgba(245,245,247,0)_68%)]" />
      <Navbar />

      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-24">
        {sent ? (
          <div className="w-full max-w-md">
            <div className="liquid-shell rounded-[34px] p-3">
              <div className="rounded-[26px] border border-white/70 bg-[#fbfbfd]/76 p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-[#0066cc]/10 text-[#0066cc]">
                  <MailCheck className="size-7" strokeWidth={1.8} />
                </div>
                <h1 className="mb-2 text-[26px] font-semibold tracking-[-0.02em]">Check your inbox</h1>
                <p className="mb-6 text-[15px] leading-7 text-[#6e6e73]">
                  We sent a verification link to <strong className="text-[#1d1d1f]">{email}</strong>. Click
                  it to activate your account, then sign in. The link expires in 24 hours.
                </p>
                <Link
                  href="/sign-in"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0066cc] text-[15px] font-medium text-white transition-all duration-150 hover:bg-[#0071e3] active:scale-[0.97]"
                >
                  Go to sign in
                  <ArrowRight className="size-4" strokeWidth={1.8} />
                </Link>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resent}
                  className="mt-4 text-[13px] text-[#0066cc] transition hover:underline disabled:text-[#86868b] disabled:no-underline"
                >
                  {resent ? "Verification email resent." : "Didn't get it? Resend email"}
                </button>
                <p className="mt-3 text-[12px] text-[#86868b]">
                  Check your spam folder if it doesn&apos;t arrive within a minute.
                </p>
              </div>
            </div>
          </div>
        ) : (
        <div className="w-full max-w-md">
          <h1 className="mb-2 text-center text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">
            Create an account.
          </h1>
          <p className="mb-10 text-center text-[17px] text-[#6e6e73]">
            Join EdSynapse and transform how you learn.
          </p>

          <div className="liquid-shell rounded-[34px] p-3">
            <div className="rounded-[26px] border border-white/70 bg-[#fbfbfd]/76 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
              
              {/* Role Toggle */}
              <div className="mb-6 flex rounded-[16px] bg-[#1d1d1f]/5 p-1">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-[12px] py-2 text-[14px] font-medium transition-all duration-200",
                    role === "student" 
                      ? "bg-white text-[#1d1d1f] shadow-sm" 
                      : "text-[#6e6e73] hover:text-[#1d1d1f]"
                  )}
                >
                  <User className="size-4" />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-[12px] py-2 text-[14px] font-medium transition-all duration-200",
                    role === "teacher" 
                      ? "bg-white text-[#1d1d1f] shadow-sm" 
                      : "text-[#6e6e73] hover:text-[#1d1d1f]"
                  )}
                >
                  <GraduationCap className="size-4" />
                  Teacher
                </button>
              </div>

              <form onSubmit={handleSignUp} className="space-y-3">
                {error && (
                  <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-600">
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex-1 rounded-[18px] border border-[#1d1d1f]/10 bg-white/82 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition focus-within:border-[#0066cc]/45 focus-within:ring-4 focus-within:ring-[#0066cc]/10">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="h-12 w-full bg-transparent text-[17px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                      required
                    />
                  </div>
                  <div className="flex-1 rounded-[18px] border border-[#1d1d1f]/10 bg-white/82 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition focus-within:border-[#0066cc]/45 focus-within:ring-4 focus-within:ring-[#0066cc]/10">
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="h-12 w-full bg-transparent text-[17px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-[18px] border border-[#1d1d1f]/10 bg-white/82 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition focus-within:border-[#0066cc]/45 focus-within:ring-4 focus-within:ring-[#0066cc]/10">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="h-12 w-full bg-transparent text-[17px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                    required
                  />
                </div>

                <div className="rounded-[18px] border border-[#1d1d1f]/10 bg-white/82 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition focus-within:border-[#0066cc]/45 focus-within:ring-4 focus-within:ring-[#0066cc]/10">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="h-12 w-full bg-transparent text-[17px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                    required
                  />
                </div>

                {/* Password policy checklist */}
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
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "border-rose-300 focus-within:border-rose-400"
                      : "border-[#1d1d1f]/10 focus-within:border-[#0066cc]/45",
                  )}
                >
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="h-12 w-full bg-transparent text-[17px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                    required
                  />
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
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
                      Create account
                      <ArrowRight className="size-4" strokeWidth={1.8} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center text-[13px] text-[#86868b]">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-[#0066cc] transition hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
