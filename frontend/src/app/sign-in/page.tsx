"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { login } from "@/lib/useAuth";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Identity and authority come from the account's real role in the DB —
      // there is no portal/role to pick, so the user can never land in the
      // "wrong" interface. We route by the role the server returns.
      const user = await login(email.trim(), password);
      const redirect = searchParams.get("redirect");
      if (redirect && redirect.startsWith(`/${user.role}`)) {
        router.push(redirect);
      } else {
        router.push(
          user.role === "admin" ? "/admin" : user.role === "teacher" ? "/teacher/dashboard" : "/student",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
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
            Welcome back.
          </h1>
          <p className="mb-10 text-center text-[17px] text-[#6e6e73]">
            Sign in to continue your learning journey.
          </p>

          <div className="liquid-shell rounded-[34px] p-3">
            <div className="rounded-[26px] border border-white/70 bg-[#fbfbfd]/76 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
              <form onSubmit={handleSignIn} className="space-y-3">
                {error && (
                  <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-600">
                    {error}
                  </div>
                )}
                <div className="rounded-[18px] border border-[#1d1d1f]/10 bg-white/82 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition focus-within:border-[#0066cc]/45 focus-within:ring-4 focus-within:ring-[#0066cc]/10">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu"
                    className="h-12 w-full bg-transparent text-[17px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                    required
                  />
                </div>

                <div className="rounded-[18px] border border-[#1d1d1f]/10 bg-white/82 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition focus-within:border-[#0066cc]/45 focus-within:ring-4 focus-within:ring-[#0066cc]/10">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="h-12 w-full bg-transparent text-[17px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0066cc] text-[15px] font-medium text-white transition-all duration-150 hover:bg-[#0071e3] active:scale-[0.97] disabled:opacity-60"
                >
                  {loading ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="size-4" strokeWidth={1.8} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link href="/forgot-password" className="text-[13px] text-[#0066cc] transition hover:underline">
                  Forgot password?
                </Link>
              </div>

              <div className="mt-3 text-center text-[13px] text-[#86868b]">
                Don't have an account?{" "}
                <Link href="/sign-up" className="text-[#0066cc] transition hover:underline">
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
