import Link from "next/link";
import Image from "next/image";

/**
 * Public site footer — shared by the landing page and the company/legal pages.
 * The registered legal entity is "EdSynapse Educational Services Inc."; the
 * product is marketed as "EdSynapse".
 */

const LINK_GROUPS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Platform",
    links: [
      { label: "For Students", href: "/#students" },
      { label: "For Teachers", href: "/#teachers" },
      { label: "For Institutions", href: "/#institutions" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Our research", href: "/about#research" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    heading: "Get in touch",
    links: [{ label: "hello@edsynapse.com", href: "mailto:hello@edsynapse.com" }],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-[#1d1d1f]/10 bg-[#f5f5f7]">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-16 sm:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
          {/* Brand + positioning */}
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg">
                <Image src="/logo.png" alt="EdSynapse" fill sizes="32px" className="object-contain" />
              </span>
              <span className="text-base font-bold tracking-tight text-[#1d1d1f]">EdSynapse</span>
            </Link>
            <p className="mt-4 text-[15px] font-medium leading-6 text-[#1d1d1f]">
              Designed by educators. Backed by research.
            </p>
            <p className="mt-2 text-[13px] leading-5 text-[#6e6e73]">
              A personalized AI tutor that adapts to each learner, grounds every lesson in
              authentic course material, and checks understanding as it goes.
            </p>
          </div>

          {/* Link columns */}
          {LINK_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#1d1d1f]">
                {group.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-[#6e6e73] transition-colors hover:text-[#0066cc]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-3 border-t border-[#1d1d1f]/10 pt-6 text-[13px] text-[#6e6e73] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} EdSynapse Educational Services Inc. All rights reserved.</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/terms" className="transition-colors hover:text-[#0066cc]">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-[#0066cc]">
              Privacy
            </Link>
            <span>Currently in free public beta.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
