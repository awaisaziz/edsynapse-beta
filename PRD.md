# EdSynapse — Product Requirements Document

**Version:** 2.2 (Beta)
**Status:** Draft
**Owner:** Awais Aziz
**Last updated:** June 10, 2026
**Hackathon:** AWS Databases × Vercel (devpost — h01) · **Track 4: Open Innovation**

---

## 1. Overview

**EdSynapse** is an AI-powered personalized tutoring platform for undergraduate students. Instead of giving every student the same generic explanation, it adapts on two axes — *what they already know* and *how they learn best* — and grounds every lesson in real source material rather than generic internet answers.

**One-line pitch:** *EdSynapse — an AI tutor that learns you before it teaches you, grounding every lesson in your course material and checking your understanding as it goes.*

**Goal:** Help students learn deeper by turning trustworthy material into a tutor that knows what they don't understand, teaches it the way they learn best, and continuously verifies they've actually got it.

---

## 2. Problem & Opportunity

Generic AI chatbots answer questions but don't diagnose gaps, aren't grounded in course material, and teach everyone the same way. Human tutoring does all of this well but doesn't scale and isn't free. EdSynapse sits in the gap: **source-grounded, self-diagnosing, learning-style-adaptive, and continuously verifying understanding** — at near-zero marginal cost.

---

## 3. Product Structure — Two Learning Modes + Institutional Path

EdSynapse is dual-sided by design. The same learning loop runs in two modes, with an institutional layer as the expansion path.

### 3.1 Course Mode (Teacher-Curated)
A **teacher** creates a course, defines the topic list, and uploads **vetted, authoritative source material** (lecture content, textbooks, references). Students enroll and learn against this curated corpus. Every tutor answer is traceable to the teacher's material — this is the high-trust mode. Teachers get a **cohort dashboard** showing where students struggle across topics.

### 3.2 Self-Study Mode (Student-Uploaded)
A **student** can use EdSynapse independently — no teacher required. They upload their own study material (textbooks, lecture notes, slides), and the platform builds the same grounded learning experience from it. Grounding remains traceable to whatever the student uploaded. This mode removes the cold-start problem: a student gets full value on day one without waiting for their institution to adopt.

### 3.3 Institutional Path (LMS for Organizations — post-beta)
Course Mode is the seed of an institutional product: universities, bootcamps, and training organizations adopt EdSynapse as a lightweight **LMS layer** — org-managed courses, teacher seats, cohort analytics, and admin controls. **Out of scope for the beta**, but the data model below is designed so this layer can be added without restructuring (courses already belong to teachers; an `organizations` table simply sits above them).

> **Beta scope:** Course Mode + Self-Study Mode, both fully functional. Institutional/LMS features are a documented expansion path only. Pricing/monetization is maintained as a separate page outside this PRD.

---

## 4. Users & Roles

### 4.1 Teacher
- Creates courses, defines topic lists, enrolls/invites students.
- Uploads and curates vetted source material (chunked + embedded).
- Views cohort dashboard: aggregated knowledge maps per topic.

### 4.2 Student
- **In Course Mode:** enrolls in a teacher's course and learns against curated material.
- **In Self-Study Mode:** uploads own material and creates personal study spaces.
- Runs the Diagnose → Teach+Check → Verify loop in either mode.
- Owns a personal knowledge map and downloadable progress reports.

---

## 5. Core Concept — The Learning Loop

The same **Diagnose → Teach+Check → Verify** loop runs in both modes, grounded in the relevant source material per topic.

### 5.1 Setup & Grounding
**Course Mode:** teacher uploads vetted sources per topic. **Self-Study Mode:** student uploads their own material and EdSynapse extracts a topic structure (or the student defines one). Material is chunked, embedded, and stored so every answer is traceable to its source.

### 5.2 Diagnose
A short adaptive quiz — a few targeted questions per topic — builds a personal **knowledge map** marking each topic *strong*, *moderate*, or *needs-improvement*. Exportable as a PDF report. The student can let the AI pick focus areas or choose topics themselves.

### 5.3 Teach + Continuously Check
The student sets a learning profile (Visual / Text / Audio; Deep / Methodical). Each topic gets its own specialized tutor chat, grounded in the source material and tuned to the student's level and style. The tutor **checks understanding as it teaches** — probing questions mid-explanation, adjusting in real time: deeper where there's confusion, faster where there's mastery.

### 5.4 Verify
A low-stakes, **formative-only** assessment (MCQs + short-answer) with review-before-submit, followed by a report explaining why each answer was right or wrong. Results flow back into the knowledge map, sharpening it and feeding the next loop.

---

## 6. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Email/password (or OAuth) auth with `teacher` / `student` role on each account |
| FR-2 | Role-based route protection: `/teacher/*` and `/student/*` |
| FR-3 | Teacher: create course, define topic list, enroll/invite students |
| FR-4 | Teacher: upload vetted sources; chunk + embed into vector store |
| FR-5 | Teacher: cohort dashboard aggregating student knowledge maps per topic |
| FR-6 | Student: enroll in a course (Course Mode) |
| FR-7 | Student: create a self-study space and upload own material (Self-Study Mode) |
| FR-8 | Topic extraction from uploaded material (self-study), or manual topic definition |
| FR-9 | Generate and run an adaptive diagnostic quiz per topic |
| FR-10 | Persist a per-student knowledge map (strong/moderate/needs-improvement) |
| FR-11 | Per-topic tutor chat with streaming responses, grounded with source citations |
| FR-12 | Mid-conversation comprehension checks that adapt teaching in real time |
| FR-13 | Learning-profile selector (Visual/Text/Audio; Deep/Methodical) affecting tutor behavior |
| FR-14 | Generate formative assessments (MCQ + short-answer) with review-before-submit |
| FR-15 | Auto-grade assessments and produce per-question explanation reports |
| FR-16 | Feed assessment results back into the knowledge map |
| FR-17 | Export knowledge map and results as downloadable PDF reports |
| FR-18 | Persist all student progress across sessions in the database |

---

## 7. Technical Architecture — AWS Databases × Vercel

EdSynapse is a single full-stack **Next.js (App Router)** application scaffolded with **Vercel v0**, deployed on **Vercel**, backed by **Amazon Aurora PostgreSQL**.

### 7.1 Stack
- **Frontend + backend:** Next.js App Router on Vercel (UI scaffolded via v0). API route handlers and server actions for all backend logic.
- **Database:** **Amazon Aurora PostgreSQL** with the **`pgvector`** extension. The domain is highly relational (users, courses, study spaces, topics, knowledge maps, attempts) *and* needs vector retrieval for source material — Postgres + pgvector does both in one operationally proven database.
- **DB access:** AWS RDS Data API (HTTP, serverless-friendly) or RDS Proxy pooling. ORM: Prisma or Drizzle.
- **AI:** OpenAI API (ChatGPT models) called server-side for quiz generation, streaming tutor chat (SSE), assessment generation, and grading. Retrieval-augmented: relevant chunks pulled from `pgvector` before each generation. Embeddings via OpenAI `text-embedding-3-small`/`-large`.
- **Auth:** Auth.js (NextAuth) or Clerk, with `role` stored on the user record.
- **Config:** DB endpoint/credentials and `OPENAI_API_KEY` as Vercel environment variables.

### 7.2 Request flow
```
Browser → Vercel (Next.js)
  ├─ Server action / route handler
  │    ├─ Aurora PostgreSQL  (users, courses, study spaces, topics,
  │    │                      knowledge maps, attempts + pgvector embeddings)
  │    └─ OpenAI API         (tutor, quiz/assessment gen, grading)
  └─ SSE stream back to the tutor chat UI
```

### 7.3 Core data model (Aurora PostgreSQL)
- `users` — id, email, hashed_password/oauth, **role** (`teacher` | `student`), name
- `courses` — id, **owner_id** (FK users), title, description, **mode** (`course` | `self_study`)
  - *Course Mode:* owner is a teacher. *Self-Study Mode:* owner is the student (their personal study space). One table, one loop, two modes.
- `enrollments` — student_id (FK), course_id (FK) — used in Course Mode
- `topics` — id, course_id (FK), title, order
- `sources` — id, course_id (FK), uploader_id (FK users), title, raw_ref
- `source_chunks` — id, source_id (FK), content, **embedding `vector`** (pgvector)
- `knowledge_map` — id, student_id (FK), topic_id (FK), status, updated_at
- `quiz_attempts` — id, student_id, topic_id, questions(jsonb), responses(jsonb), score, type (diagnostic|assessment)
- `tutor_sessions` — id, student_id, topic_id, messages(jsonb), learning_profile(jsonb)
- *(Post-beta institutional layer:* `organizations` + `org_memberships` sit above `courses` with no restructuring.)*

### 7.4 Why this satisfies the hackathon brief
v0 scaffolds a production-ready Next.js frontend; it connects to an AWS database (Aurora PostgreSQL) that scales from weekend prototype to production unchanged. The dual-mode design on a single schema is the Track 4 story: one creative architecture that flexes from individual self-study to teacher cohorts to institutional LMS without a rewrite.

---

## 8. UI / Design Spec

**Direction:** *Notion's clarity* meets *Duolingo's encouragement* meets *a premium study app* — for serious university-level learning.

**Color palette (blue theme):** Primary `#1E3A8A`, accent `#3B82F6`, light accent `#BFDBFE`, surface `#F0F6FF`; success/warning/danger `#22C55E` / `#F59E0B` / `#EF4444`.

**Typography:** Inter (UI), DM Sans (display), JetBrains Mono (code/data).

**Screens:**
1. **Login / Signup** — role choice (teacher or student).
2. **Teacher — Course & Source Management** — create course, define topics, upload/curate material.
3. **Teacher — Cohort Dashboard** — topic-by-topic view of where students struggle.
4. **Student — Home** — enrolled courses + personal study spaces; "Enroll in a course" and "Start self-study" entry points.
5. **Student — Self-Study Setup** — upload material, confirm extracted/defined topics.
6. **Student — Knowledge Map Dashboard** — topic statuses, progress everywhere.
7. **Diagnostic Quiz** — short adaptive quiz flow.
8. **Tutor Chat** — AI responses in `#EFF6FF` cards with avatar + source-citation pill badges (e.g. "📖 Organic Chemistry, Ch. 4"); user messages right-aligned in `#1E3A8A`; inline comprehension checks as distinct ⚡ cards; learning-style toggle strip on top.
9. **Assessment Screen** — numbered question cards, radio-style MCQ cards, expanding short-answer; "Review Before Submit" highlights unanswered in amber; post-submit explanation panels.
10. **Results & Progress Report** — celebration moment, topic-by-topic bar chart, "What to study next" card, prominent Download PDF button.

**Design principles:** calm focus; progress everywhere; trust signals via source citations; encouraging never punishing ("Let's revisit this" instead of red X marks); mobile-aware chat/quiz flows, desktop-first dashboard.

---

## 9. Implementation Plan (Two Stages)

**Stage 1 — Core Loop + Auth (both modes)**
Auth with teacher/student roles; teacher can create a course, add topics, upload sources; student can enroll **or** create a self-study space with their own upload; run Diagnose → Teach+Check → Verify end-to-end against Aurora + OpenAI with a minimal functional UI. Confirm working before Stage 2.

**Stage 2 — Polish & Full Workflow**
Polished blue-themed v0 frontend across all ten screens; pgvector retrieval grounding with citations; teacher cohort dashboard; topic extraction for self-study uploads; PDF report generation; full knowledge-map feedback loop; deployment hardening on Vercel + Aurora.

**Beta deliverable:** dual-mode product deployed on Vercel against Aurora PostgreSQL, two-role auth, blue UI wired to streaming tutor + assessments, PDF reports downloadable.

---

## 10. Success Metrics

- Functional end-to-end loop in **both modes**: diagnose → teach → verify → updated knowledge map.
- Two-role auth and route protection working.
- Tutor faithfulness to source material.
- Assessment grading correctness.
- Knowledge-map accuracy improving across loop iterations.
- App deployed and running on the Vercel + Aurora foundation.

---

## 11. Pedagogical Principles

Effective AI tutoring shifts cognitive labor to the student, surfaces assumptions, and avoids "guess what I'm thinking" dynamics. Continuous comprehension checking (Teach+Check) is the mechanism. Assessment is **formative-only** — low-stakes, explanatory, never punitive. Critical-thinking gains from Socratic-style methods are more reliable *within a practiced domain* than as general transfer skills, so learning loops are scoped and evaluated per-domain.

---

## 12. Open Questions

- Auth provider: Auth.js vs. Clerk?
- Aurora access method: RDS Data API vs. RDS Proxy?
- Self-study topic extraction: fully automatic, student-confirmed, or manual-first for beta?
- File types supported for student uploads in beta (PDF only vs. PDF + slides + notes)?
