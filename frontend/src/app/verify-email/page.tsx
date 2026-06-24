"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { verifyEmail } from "@/lib/useAuth";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // tokens are single-use — verify exactly once
    ran.current = true;
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    verifyEmail(token)
      .then(() => setStatus("ok"))
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed.");
      });
  }, [token]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.96),rgba(245,245,247,0)_68%)]" />
      <Navbar />

      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-24">
        <div className="w-full max-w-md">
          <div className="liquid-shell rounded-[34px] p-3">
            <div className="rounded-[26px] border border-white/70 bg-[#fbfbfd]/76 p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
              {status === "loading" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="size-8 animate-spin rounded-full border-[3px] border-[#0066cc]/20 border-t-[#0066cc]" />
                  <p className="text-[15px] text-[#6e6e73]">Verifying your email…</p>
                </div>
              )}
              {status === "ok" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <p className="text-[17px] font-semibold">Email verified</p>
                  <p className="text-[13px] text-[#6e6e73]">Your account is now secured.</p>
                  <Link
                    href="/sign-in"
                    className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-[#0066cc] px-6 text-[15px] font-medium text-white transition hover:bg-[#0071e3]"
                  >
                    Continue to sign in
                  </Link>
                </div>
              )}
              {status === "error" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <XCircle className="size-6" />
                  </div>
                  <p className="text-[17px] font-semibold">Verification failed</p>
                  <p className="text-[13px] text-[#6e6e73]">{message}</p>
                  <p className="mt-1 text-[13px] text-[#86868b]">
                    You can request a new link from your{" "}
                    <Link href="/settings" className="text-[#0066cc] hover:underline">
                      account settings
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
