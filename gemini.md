# GEMINI.md

This file provides guidance to Gemini / Antigravity when working with code in this repository.

**Never run `git push`** (including to `main` or any remote branch) unless the user explicitly asks for it in that turn.

**EdSynapse** is a personalized AI tutoring platform (B2C): an AI tutor that
adapts to a learner's preferences, grounds every lesson in their own material,
and checks understanding as it goes. Built for the H0 hackathon (Open Innovation
track), launching as a free 1-month beta. Live at https://edsynapse-beta.vercel.app.
See [`PRD.md`](PRD.md) for the product spec,
[`docs/architecture.md`](docs/architecture.md) for the system diagram, and
[`docs/auth.md`](docs/auth.md) for the auth model + Resend email setup.

## Roles & the learning loop

- **Teacher** — creates courses (with a join code) + lessons, uploads authentic
  source material (chunked + embedded for RAG), views a cohort analytics
  dashboard.
- **Student** — joins a teacher's course by code *or* self-uploads material to
  create a personal `self_study` course; runs the loop
  **Diagnose → Teach+Check → Verify** with subject cards and a personal knowledge map.
- **Admin** — user directory (suspend/reactivate), course oversight, and a
  support inbox (admin ↔ user threads).

## Stack

Single full-stack **Next.js 15 (App Router) + React 19 + TypeScript** app. UI
**and** backend live in the same project under `frontend/`; the backend is
Next.js API route handlers (no separate service).

- Tailwind CSS v4 (`@tailwindcss/postcss`) + lucide icons. No component library
  is installed — UI primitives in `src/components/ui/` are hand-rolled.
- **Raw SQL over `pg`** (no ORM — Prisma was removed). All DB access goes through
  `src/lib/db.ts` helpers (`query` / `queryOne` / `withTransaction`).
- **Amazon Aurora PostgreSQL 17 + pgvector 0.8** (cluster `aws-edsynapse-beta`,
  us-east-1). Schema is created/migrated by the SQL files in `frontend/scripts/`.
- **OpenAI** (`gpt-4o-mini` chat, `text-embedding-3-small` 1536-dim) — server-side
  only via `src/lib/openai.ts`: quiz/assessment generation, streaming tutor (SSE),
  grading, and RAG embeddings.
- Deployed on **Vercel**, project `edsynapse-beta` (team `awais-projects5`).

## Database connection — IAM auth, NOT a connection string

**There is no `DATABASE_URL` and no DB password.** Aurora is reached via Vercel's
AWS integration using IAM/OIDC. `src/lib/db.ts` mints a short-lived RDS auth token
on every connection: `awsCredentialsProvider` (from `@vercel/functions/oidc`)
assumes `AWS_ROLE_ARN` using `VERCEL_OIDC_TOKEN`, then `@aws-sdk/rds-signer`
generates the token used as the pg `password` callback.

Env vars the app actually needs (documented in `frontend/.env.example`) (set in Vercel for all environments, pulled
locally via `vercel env pull`): `AWS_REGION`, `PGHOST`, `PGUSER`, `PGDATABASE`,
`AWS_ROLE_ARN`, `VERCEL_OIDC_TOKEN`, `OPENAI_API_KEY`. Optional:
`NEXT_PUBLIC_API_URL` (point the client at an external API; empty = same-origin).

**Local dev gotcha:** the pulled `VERCEL_OIDC_TOKEN` expires (~12h). When local DB
calls start failing with auth errors, re-run
`vercel env pull frontend/.env.local --environment=development` (or use
`vercel dev`, which auto-refreshes).

## Auth & request flow

Custom email/password auth on Aurora (`src/lib/auth.ts`) — no Clerk.

- Passwords: scrypt + per-user salt. Sessions: opaque `nanoid(40)` tokens in the
  `sessions` table, referenced by an httpOnly `edsynapse_session` cookie.
- `src/middleware.ts` is a **cookie-presence-only** edge gate (no DB at the edge):
  redirects unauthenticated users off `/student|/teacher|/admin` and logged-in
  users off `/sign-in|/sign-up`. **Real auth + role checks happen server-side** in
  route handlers via `requireUser(role?)`, which throws an `AuthError`.
- Route handlers wrap their body in `handle()` from `src/lib/apiHelpers.ts`, which
  maps `AuthError` → its status and everything else → 500. Use `badRequest` /
  `notFound` for explicit responses.

So the pattern for a protected route is: `export const GET = handle(async () => {
const user = await requireUser("teacher"); ... })`.

## RAG & LLM pipeline

- `src/lib/rag.ts` owns chunking (~1200 chars, 150 overlap, on sentence/paragraph
  boundaries), embedding (batches of 96), storing into `source_chunks` as
  `vector(1536)` and cosine retrieval (`<=>` with the ivfflat index). `retrieve()`
  returns `[]` when a course has no embedded material → ungrounded fallback.
- `src/lib/llm.ts` is the high-level layer: `groundedContext()` (retrieve + build context/citations), and
  `streamTutorReply()` (async-generator of text deltas for SSE). Every generation
  applies `GROUNDING_RULE`: prefer source material, never contradict it, never
  invent citations.

## API surface & the typed client

`src/lib/edsynapseApi.ts` is the **single source of truth for the frontend↔backend
contract** — `studentApi` and `teacherApi` objects plus all the DTO interfaces
(`Course`, `KnowledgeMap`, `DiagnosticQuiz`, `Assessment`, `GradeReport`,
`CourseAnalytics`, …). Pages call these, never `fetch` directly. When you add or
change a route, update the matching method + DTO here.

Routes live under `src/app/api/{auth,student,teacher,courses,admin,support}/**`.
Notable ones: source upload + RAG ingest is `courses/[id]/sources` (multipart);
the streaming tutor is `student/tutor/stream` (SSE: token deltas, a `sources`
event, then `done`); cohort data is `teacher/courses/[id]/analytics`.

Server-side domain helpers (used by routes, not the client):
`src/lib/courses.ts` (`serializeCourse`, `generateCourseCode`),
`src/lib/knowledge.ts` (`scoreToLevel`, `upsertKnowledgeState`, `getKnowledgeMap`),
`src/lib/fileParsing.ts` (`detectFileType`/`extractText` via `unpdf`/`mammoth`/`xlsx`),
`src/lib/admin.ts` (support-thread serialization).

`src/lib/useAuth.ts` is the client auth hook (`useAuth`, `login`, `register`,
`logout`). `src/lib/assessmentStore.ts` is a legitimate sessionStorage cache for a
just-graded report handed between pages — **not** mock data. All mock/localStorage
data modules (`mockData`, `courseStore`, `adminStore`, `messageStore`) have been
removed; do not reintroduce them.

## Data model

10 core + 3 admin/support tables (see `frontend/scripts/001-init-schema.sql`,
`002-admin-support.sql`, and `004-profiles.sql`). IDs are app-generated `TEXT`
(nanoid), not serial. Core: `users` (role `teacher|student|admin`, `status
active|suspended`, `password_hash`; profile: `first_name`, `last_name`, `bio`,
`institution` = university, `field` = program/department, `title`,
`education_level`, `learning_modality` `visual|text|audio|all`, `learning_pace`
`deep|methodical|regular`, `onboarded` — set true after the required onboarding
step), `sessions`, `courses` (`kind class|self_study`, unique join
`code`), `lessons` (JSONB `outline`, `published`), `enrollments`, `sources`,
`source_chunks` (`vector(1536)` + ivfflat cosine index), `knowledge_states`
(unique per `student+course+topic`, level `strong|moderate|needs_improvement`),
`quiz_attempts` (`kind diagnostic|assessment`), `tutor_sessions`.
Admin/support: `support_threads`, `support_messages`.

## Commands

```bash
cd frontend
npm install          # plain install — no postinstall codegen anymore
npm run dev          # http://localhost:3000
npm run build        # next build (also the typecheck gate)
npm run lint         # next lint
npm run db:setup     # apply scripts/*.sql to Aurora in order (IAM auth via OIDC)
```

`db:setup` runs `scripts/run-sql.mjs`, which connects to Aurora the same IAM way
as the app and applies the numbered SQL files (idempotent — safe to re-run). It
loads env from the **repo root** `../.env.development.local`. There is **no test
suite**; `npm run build` is the correctness gate.

## Conventions

- Components: PascalCase (`Navbar.tsx`). Library `.ts`: camelCase (`edsynapseApi.ts`).
- Routes / CSS classes: kebab-case; dynamic segments `[code]`, `[id]`.
- Imports: `@/*` → `frontend/src/*`.
- DB access only through `src/lib/db.ts`; parameterize all queries (`$1`, `$2`).
- `openai.ts`/`db.ts`/`auth.ts` and the lib domain helpers are **server-only** —
  never import them into a client component.

## Theme

Blue theme as CSS variables in `frontend/src/app/globals.css`: primary `#1E3A8A`,
accent/ring `#3B82F6`, light accent `#BFDBFE`, surface `#F0F6FF`; success
`#22C55E`, warning `#F59E0B`, danger `#EF4444`. Fonts via `next/font` in
`layout.tsx`: Inter (`--font-sans`), DM Sans (`--font-display`), JetBrains Mono
(`--font-mono`).

## Deployment

Vercel project root directory is set to `frontend/`, and `frontend/vercel.json`
declares `"framework": "nextjs"` (without it the build succeeds but serves 404s —
this was the original broken-deploy cause). Pushing to `main` deploys. Env vars
(incl. the AWS/PG IAM set and `OPENAI_API_KEY`) are configured in the Vercel
project for Production/Preview/Development.
