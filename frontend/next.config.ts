import type { NextConfig } from "next";

// Defense-in-depth security headers applied to every response. These complement
// the httpOnly/secure/sameSite session cookie — they don't replace it.
const securityHeaders = [
  // Force HTTPS for 2 years (incl. subdomains). Vercel serves HTTPS already; this
  // tells browsers to never even attempt http, blocking SSL-strip downgrades.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Block this site from being framed elsewhere (clickjacking defense).
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let browsers MIME-sniff responses into a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (which may carry tokens) to third-party sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop ambient access to powerful device APIs we never use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder. The repo has lockfiles at both the
  // root and here (frontend/), so without this Turbopack guesses the wrong root
  // and warns. The app lives entirely under frontend/.
  turbopack: { root: __dirname },
  // Keep native/server-only packages out of the client/runtime bundle.
  serverExternalPackages: ["pg", "@aws-sdk/rds-signer", "@aws-sdk/client-rds", "unpdf", "mammoth", "xlsx"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
