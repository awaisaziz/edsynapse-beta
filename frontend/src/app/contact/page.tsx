import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/landing/LegalShell";

export const metadata: Metadata = {
  title: "Contact — EdSynapse",
  description: "Get in touch with EdSynapse Educational Services Inc.",
};

export default function ContactPage() {
  return (
    <LegalShell title="Contact us" subtitle="We'd love to hear from you.">
      <p>
        Whether you&apos;re a student, a teacher, or an institution exploring EdSynapse, reach out
        and we&apos;ll get back to you.
      </p>

      <LegalSection heading="General & support">
        <p>
          Email us at{" "}
          <a className="text-[#0066cc] hover:underline" href="mailto:hello@edsynapse.com">
            hello@edsynapse.com
          </a>
          . If you&apos;re already using the platform, you can also open a support thread from inside
          your dashboard.
        </p>
      </LegalSection>

      <LegalSection heading="Privacy requests">
        <p>
          For questions about your data or to exercise a privacy right, contact{" "}
          <a className="text-[#0066cc] hover:underline" href="mailto:privacy@edsynapse.com">
            privacy@edsynapse.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Company">
        <p>
          EdSynapse is operated by <strong>EdSynapse Educational Services Inc.</strong>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
