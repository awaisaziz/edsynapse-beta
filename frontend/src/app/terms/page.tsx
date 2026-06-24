import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/landing/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service — EdSynapse",
  description: "The terms governing your use of the EdSynapse platform.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" subtitle="Last updated: June 24, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the EdSynapse
        platform, websites, and related services (collectively, the &quot;Service&quot;) provided by{" "}
        <strong>EdSynapse Educational Services Inc.</strong> (&quot;EdSynapse,&quot; &quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;). By creating an account or using the Service, you agree to
        these Terms. If you do not agree, do not use the Service.
      </p>

      <LegalSection heading="1. Eligibility and accounts">
        <p>
          You must be old enough to form a binding contract in your jurisdiction, or use the Service
          under the supervision of a parent, teacher, or institution that accepts these Terms on your
          behalf. You are responsible for keeping your account credentials secure and for all
          activity under your account. Provide accurate information and keep it up to date.
        </p>
      </LegalSection>

      <LegalSection heading="2. Beta service">
        <p>
          The Service is currently offered as a free public beta. It may change, be interrupted, or
          be discontinued at any time, and may contain errors. Features, limits, and pricing may
          change as the Service evolves beyond beta.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your content and material">
        <p>
          You and your institution retain ownership of the course material, documents, and other
          content you upload (&quot;Your Content&quot;). You grant EdSynapse a limited license to
          host, process, chunk, embed, and otherwise use Your Content solely to operate and provide
          the Service to you — for example, to generate lessons, tutoring responses, and assessments
          grounded in your material. You are responsible for ensuring you have the rights to upload
          Your Content and that it does not infringe the rights of others or violate any law.
        </p>
      </LegalSection>

      <LegalSection heading="4. AI-generated output">
        <p>
          The Service uses artificial intelligence to generate study materials, tutoring responses,
          quizzes, and assessments. AI output may be inaccurate or incomplete and should not be
          relied upon as a substitute for professional judgment. Teachers and learners are
          responsible for reviewing AI-generated content. EdSynapse does not guarantee any particular
          learning outcome, grade, or result.
        </p>
      </LegalSection>

      <LegalSection heading="5. Acceptable use">
        <p>You agree not to:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>use the Service for any unlawful, harmful, or fraudulent purpose;</li>
          <li>upload content you do not have the right to use, or that is unlawful or infringing;</li>
          <li>attempt to disrupt, reverse engineer, or gain unauthorized access to the Service;</li>
          <li>misuse the AI features to generate harmful, abusive, or deceptive content; or</li>
          <li>resell or commercially exploit the Service without our written permission.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Intellectual property">
        <p>
          The Service, including its software, design, and branding, is owned by EdSynapse and its
          licensors and is protected by intellectual-property laws. Except for the rights expressly
          granted to you, no rights are transferred to you.
        </p>
      </LegalSection>

      <LegalSection heading="7. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate your access if you
          violate these Terms or if we discontinue the Service. Provisions that by their nature
          should survive termination will survive.
        </p>
      </LegalSection>

      <LegalSection heading="8. Disclaimers">
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties
          of any kind, whether express or implied, to the fullest extent permitted by law. We do not
          warrant that the Service will be uninterrupted, secure, or error-free.
        </p>
      </LegalSection>

      <LegalSection heading="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, EdSynapse will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or any loss of data, arising from
          your use of the Service.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to these Terms">
        <p>
          We may update these Terms from time to time. If we make material changes, we will take
          reasonable steps to notify you. Your continued use of the Service after changes take effect
          constitutes acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact">
        <p>
          Questions about these Terms? Contact us at{" "}
          <a className="text-[#0066cc] hover:underline" href="mailto:hello@edsynapse.com">
            hello@edsynapse.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
