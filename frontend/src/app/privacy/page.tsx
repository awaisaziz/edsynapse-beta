import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/landing/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy — EdSynapse",
  description: "How EdSynapse collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" subtitle="Last updated: June 24, 2026">
      <p>
        This Privacy Policy explains how <strong>EdSynapse Educational Services Inc.</strong>{" "}
        (&quot;EdSynapse,&quot; &quot;we,&quot; &quot;us&quot;) collects, uses, and protects
        information when you use the EdSynapse platform (the &quot;Service&quot;). We are committed to
        handling student and educator data responsibly.
      </p>

      <LegalSection heading="1. Information we collect">
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Account information</strong> — your name, email address, role (student, teacher,
            or administrator), and profile details such as institution, field of study, and learning
            preferences.
          </li>
          <li>
            <strong>Course material you upload</strong> — documents, slides, and other source files,
            which we process to provide grounded tutoring and study materials.
          </li>
          <li>
            <strong>Learning activity</strong> — courses, lessons, quiz and assessment attempts,
            tutor conversations, and knowledge-map data generated as you use the Service.
          </li>
          <li>
            <strong>Technical data</strong> — basic log and device information needed to operate and
            secure the Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How we use information">
        <p>We use information to:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>provide, personalize, and improve the Service;</li>
          <li>
            generate study materials, tutoring responses, quizzes, and assessments grounded in your
            course material;
          </li>
          <li>maintain knowledge maps and analytics for learners, teachers, and institutions;</li>
          <li>secure the Service, authenticate users, and prevent abuse; and</li>
          <li>communicate with you about the Service, including support requests.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. AI processing and service providers">
        <p>
          To deliver AI features, content you submit (such as questions and relevant excerpts of
          course material) may be processed by trusted third-party providers, including our AI model
          provider and our cloud database and hosting providers. We share only what is necessary to
          operate the Service, and we require these providers to protect your information. We do not
          sell your personal information.
        </p>
      </LegalSection>

      <LegalSection heading="4. Student data">
        <p>
          When EdSynapse is used through a school or institution, the institution may control certain
          student data and act as the data controller for that information. We process student data
          on their behalf to provide the Service and do not use student personal information to build
          advertising profiles.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>
          We retain your information for as long as your account is active or as needed to provide
          the Service, comply with legal obligations, resolve disputes, and enforce our agreements.
          You may request deletion of your account and associated data as described below.
        </p>
      </LegalSection>

      <LegalSection heading="6. Security">
        <p>
          We use technical and organizational measures to protect your information, including
          encrypted connections, scoped database access, and hashed passwords. No method of
          transmission or storage is completely secure, but we work to protect your data and respond
          promptly to issues.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>
          Depending on your location, you may have rights to access, correct, export, or delete your
          personal information, and to object to or restrict certain processing. To exercise these
          rights, contact us at{" "}
          <a className="text-[#0066cc] hover:underline" href="mailto:privacy@edsynapse.com">
            privacy@edsynapse.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="8. Children's privacy">
        <p>
          Where the Service is used by learners under the age applicable in their jurisdiction, it is
          intended to be used under the supervision of a parent, teacher, or institution that has
          provided any required consent. If you believe a child has provided us personal information
          without appropriate consent, contact us and we will take appropriate steps.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we will
          take reasonable steps to notify you. The &quot;Last updated&quot; date above reflects the
          most recent revision.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact">
        <p>
          Questions about this policy or your data? Contact us at{" "}
          <a className="text-[#0066cc] hover:underline" href="mailto:privacy@edsynapse.com">
            privacy@edsynapse.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
