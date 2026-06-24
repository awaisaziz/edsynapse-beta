/**
 * Transactional email via Resend's HTTPS API (no SMTP server to run; works on
 * Vercel serverless). SERVER ONLY.
 *
 * Config (Vercel env vars):
 * - RESEND_API_KEY  — required to actually send. When unset, sends are skipped
 *   (logged) so local dev / preview without a key doesn't crash auth flows.
 * - EMAIL_FROM      — sender, e.g. "EdSynapse <noreply@yourdomain.com>". Until a
 *   domain is verified in Resend, their shared "onboarding@resend.dev" sender
 *   works for testing (can only deliver to your own Resend account email).
 * - NEXT_PUBLIC_APP_URL — base URL used to build links (falls back to the
 *   request origin passed by callers).
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Dev convenience: when email isn't configured (no RESEND_API_KEY) and we're not
 * in production, print the action link to the server console so local testing of
 * verification/reset flows doesn't require a real email provider. No-op once
 * email is configured or in production, so links never leak in real deployments.
 */
export function logDevLink(label: string, url: string): void {
  if (!isEmailConfigured() && process.env.NODE_ENV !== "production") {
    console.log(`\n[email:dev] ${label} link (email not configured):\n${url}\n`);
  }
}

/**
 * Send an email. Resolves true if dispatched, false if email is not configured.
 * Throws only on an actual API failure so callers can decide how to surface it.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "EdSynapse <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping send to", to, "subject:", subject);
    return false;
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text: text ?? stripHtml(html) }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[email] send failed", res.status, detail);
    throw new Error("Failed to send email");
  }
  return true;
}

/**
 * Resolve the app's public base URL for building links in emails. Prefers the
 * explicit NEXT_PUBLIC_APP_URL, then the request origin, then localhost.
 */
export function appBaseUrl(req?: { headers: Headers; url: string }): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
    try {
      return new URL(req.url).origin;
    } catch {
      /* fall through */
    }
  }
  return "http://localhost:3000";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Minimal branded wrapper so verification + reset emails look consistent. */
export function renderActionEmail(opts: {
  heading: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  footnote?: string;
}): string {
  const { heading, body, buttonLabel, buttonUrl, footnote } = opts;
  return `
  <div style="background:#f0f6ff;padding:32px 0;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#1E3A8A;">${heading}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">${body}</p>
      <a href="${buttonUrl}" style="display:inline-block;background:#1E3A8A;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:9999px;">${buttonLabel}</a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;">${footnote ?? "If you didn't request this, you can safely ignore this email."}</p>
      <p style="margin:16px 0 0;font-size:12px;color:#cbd5e1;word-break:break-all;">Or paste this link: ${buttonUrl}</p>
    </div>
  </div>`;
}
