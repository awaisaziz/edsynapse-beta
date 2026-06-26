import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/landing/LegalShell";

export const metadata: Metadata = {
  title: "About — EdSynapse",
  description:
    "EdSynapse is a personalized AI tutoring platform designed by educators and backed by research, serving students, teachers, and educational institutions.",
};

export default function AboutPage() {
  return (
    <LegalShell
      title="About EdSynapse"
      subtitle="Designed by educators. Backed by research."
    >
      <p>
        EdSynapse is a personalized AI tutoring platform built on a simple belief: every learner
        deserves a tutor that adapts to them. Our AI tutor adjusts to a learner&apos;s preferences,
        grounds every lesson in their own course material, and checks understanding as it goes —
        running a continuous loop of <strong>diagnose, teach and check, then verify</strong>.
      </p>
      <p>
        EdSynapse is operated by <strong>EdSynapse Educational Services Inc.</strong> The platform
        is currently available as a free public beta.
      </p>

      <LegalSection heading="Who we serve">
        <p>EdSynapse is built for the whole learning loop:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Students</strong> join a course by code or upload their own material to create a
            personal study space, then learn with an adaptive tutor and a personal map of their
            strengths and gaps.
          </li>
          <li>
            <strong>Teachers</strong> create courses, upload authentic source material, choose study
            modes, and follow cohort progress through an analytics dashboard.
          </li>
          <li>
            <strong>Educational institutions</strong> roll EdSynapse out across programs with course
            oversight and administration, so personalized tutoring scales beyond one classroom.
          </li>
        </ul>
      </LegalSection>

      <section id="research" className="scroll-mt-28 space-y-3">
        <h2 className="pt-4 text-[22px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
          Our research foundation
        </h2>
        <p>
          EdSynapse is developed with input from active research in AI for education. Rather than
          treating AI as a novelty, we map each part of the product to established findings from the
          learning sciences:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Socratic tutoring</strong> — the tutor guides with questions and scaffolds
            toward understanding instead of simply handing over answers.
          </li>
          <li>
            <strong>Mastery learning</strong> — learners diagnose gaps first, then teach-and-check
            until a concept is genuinely understood before moving on.
          </li>
          <li>
            <strong>Retrieval practice and the testing effect</strong> — frequent, low-stakes checks
            turn studying into active recall, which strengthens long-term memory.
          </li>
          <li>
            <strong>Worked examples and scaffolding</strong> — support is offered at the right level
            and gradually withdrawn as competence and confidence grow.
          </li>
          <li>
            <strong>Grounding and personalization</strong> — lessons are grounded in the
            learner&apos;s own material and adapt to their pace and modality preferences.
          </li>
        </ul>
        <p className="text-[14px] text-[#6e6e73]">
          EdSynapse is led by a researcher working in the field of AI in Education, and the
          platform&apos;s pedagogy reflects that ongoing work.
        </p>
      </section>

      <LegalSection heading="Get in touch">
        <p>
          Questions, feedback, or partnership inquiries? Visit our{" "}
          <a className="text-[#0066cc] hover:underline" href="/contact">
            contact page
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
