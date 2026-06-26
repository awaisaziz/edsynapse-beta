# EdSynapse

A personalized **AI tutoring platform**: an AI tutor that adapts to a learner's
preferences, grounds every lesson in their own uploaded material (RAG), and
checks understanding as it goes. Teachers create courses and upload authentic
source material; students run the **Diagnose → Teach + Check → Verify** loop
against a personal knowledge map.

Live beta: <https://edsynapse-beta.vercel.app>

- **Product spec:** [`PRD.md`](PRD.md)
- **Architecture, data model & conventions:** [`CLAUDE.md`](CLAUDE.md)

---

## Stack

Single full-stack **Next.js 15 (App Router) + React 19 + TypeScript** app — UI
**and** backend (`/api` route handlers) live together under [`frontend/`](frontend).

| Layer | Tech |
|-------|------|
| Frontend | Next.js App Router, React 19, Tailwind CSS v4, lucide icons |
| Backend | Next.js API route handlers (no separate service) |
| Database | Amazon Aurora PostgreSQL 17 + pgvector 0.8, **raw SQL over `pg`** (no ORM) |
| AI | OpenAI — `gpt-4o-mini` chat by default (override via `OPENAI_MODEL`), `text-embedding-3-small` embeddings |
| Email | **Resend** HTTPS API — email verification + password reset (`RESEND_API_KEY`, `EMAIL_FROM`). Inbound mail handled separately by Cloudflare Email Routing |
| Hosting | Vercel (project `edsynapse-beta`) |

---

## ⚠️ Read this first: the database uses IAM auth, not a password

There is **no `DATABASE_URL` and no DB password.** Aurora is reached through
Vercel's AWS integration: the app mints a short-lived RDS auth token on every
connection via OIDC (`AWS_ROLE_ARN` + `VERCEL_OIDC_TOKEN`). See
[`CLAUDE.md`](CLAUDE.md#database-connection--iam-auth-not-a-connection-string)
for the full mechanism.

**Practical consequence for local dev:** you cannot run against the real
database without **access to the Vercel project**, because that's where the env
(IAM role, PG host, OIDC token, OpenAI key) comes from. You pull it locally with
`vercel env pull`. There is no bundled local Postgres setup.

---

## Prerequisites

- **Node.js 20+** (CI/dev currently runs Node 24) and **npm**
- **Vercel CLI** — `npm i -g vercel`
- **Access to the `edsynapse-beta` Vercel project** (team `awais-projects5`) so
  you can pull the environment. Ask the project owner for an invite if you don't
  have it.

---

## Run it locally

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Authenticate + link the Vercel project (one-time)
vercel login
vercel link            # select team awais-projects5 / project edsynapse-beta

# 3. Pull the environment for the DEV SERVER — AWS/PG IAM vars, OPENAI_API_KEY,
#    RESEND_API_KEY + EMAIL_FROM (email verification / password reset), and a
#    fresh OIDC token. Run from inside frontend/, writing frontend/.env.local:
vercel env pull .env.local --environment=development

# 4. FIRST RUN ONLY (or after adding a migration): apply the DB schema. This uses
#    a SECOND env file at the repo root — see "Database schema" below.
vercel env pull ../.env.development.local --environment=development
npm run db:setup       # applies scripts/*.sql to Aurora (idempotent)

# 5. Start the dev server
npm run dev            # → http://localhost:3000
```

> If you're pointing at the already-provisioned shared Aurora cluster, the schema
> is already applied — step 4's `db:setup` is a safe no-op but you still need the
> repo-root env file if you ever run migrations. Email links (verification /
> reset) print to the server console locally when `RESEND_API_KEY` is unset.

Open <http://localhost:3000>. To confirm the app **and the database connection**
are healthy, hit the health endpoint:

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","service":"edsynapse","database":"connected", ...}
```

If `database` is `"connected"`, your IAM auth + env are working. If you get a
500 with an auth/expired-token message, see [Troubleshooting](#troubleshooting).

### `vercel dev` alternative

Running `vercel dev` instead of `npm run dev` auto-refreshes the OIDC token, so
you won't hit the ~12 h token-expiry gotcha. `npm run dev` is faster but you'll
periodically need to re-pull the env (see below).

---

## Database schema

The schema is created/migrated by the numbered SQL files in
[`frontend/scripts/`](frontend/scripts), applied with the same IAM connection as
the app. The command is idempotent.

```bash
cd frontend

npm run db:setup     # apply scripts/*.sql to Aurora in order (creates/updates tables)
```

### Running a data / schema migration

Migrations are just **numbered SQL files** in [`frontend/scripts/`](frontend/scripts)
(`001-…`, `002-…`, …) — there is no ORM or migration tool. To add or apply one:

1. Add a new file with the next number, e.g. `009-source-files.sql`. Write it
   **idempotently** (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`,
   etc.) so re-running is always safe.
2. Apply it:

   ```bash
   cd frontend
   npm run db:setup     # re-applies ALL scripts/*.sql in order; new/changed ones take effect
   ```

`db:setup` always runs every file from `001` upward, so there's no "apply just
the latest" command — the idempotent guards make a full re-run cheap and safe.
A newly added migration is live once you see its `… applying 009-….sql … ok`
line.

> **Forgot to run it?** Symptoms look like `column "…" does not exist`
> (PostgreSQL code `42703`) on the route that uses the new column. Run
> `npm run db:setup` to fix.
>
> If `db:setup` fails with `ExpiredTokenException`, refresh the repo-root env
> token first (see below), then re-run.

### ⚠️ Two env files — they don't share a token

There are **two separate local env files**, each a self-contained snapshot pulled
by `vercel env pull` and each holding its own `VERCEL_OIDC_TOKEN` (which expires
on its own ~12 h clock). Refreshing one does **not** touch the other.

| File | Read by | Refresh command |
|------|---------|-----------------|
| `frontend/.env.local` | the **dev server** (`npm run dev`, auto-loaded by Next.js) | `vercel env pull .env.local --environment=development` (run in `frontend/`) |
| `.env.development.local` (**repo root**) | `npm run db:setup` (via `--env-file-if-exists=../.env.development.local`) | `vercel env pull .env.development.local --environment=development` (run in **repo root**) |

So if the dev server works but `db:setup` fails with `ExpiredTokenException`, the
repo-root file's token is stale — refresh **that** one:

```bash
# from the repo root (edsynapse-beta/)
vercel env pull .env.development.local --environment=development

# …or, equivalently, from inside frontend/
vercel env pull ../.env.development.local --environment=development
```

Add `--yes` to skip the "overwrite existing file?" prompt.

---

## Test the workflow manually

There is **no automated test suite** — `npm run build` is the correctness/typecheck
gate. Functional testing is done by driving the app as a real user:

```bash
cd frontend
npm run build        # typecheck + production build (must pass)
npm run lint         # eslint
```

### End-to-end happy path

1. **Teacher** — go to `/sign-up`, register as a *teacher*. Create a course (you
   get a join **code**), add a lesson, and upload source material (PDF / DOCX /
   XLSX / pasted text). The file is parsed, chunked, and embedded into pgvector
   for RAG grounding. Check the cohort analytics dashboard.
2. **Student** — in another browser/incognito, register as a *student* at
   `/sign-up`. **Join the course** with the teacher's code (or self-upload
   material to create a `self_study` course). Then run the loop:
   - **Diagnose** — take the generated diagnostic quiz.
   - **Teach + Check** — chat with the source-grounded streaming tutor (replies
     render as Markdown with LaTeX math); generate smart notes and flashcards.
     The tutor keeps a durable per-topic memory of the learner — the chat's
     **reset** button clears the visible conversation but the tutor still
     remembers what you understand.
   - **Verify** — take an assessment; it's graded and updates your knowledge map.

> AI features (tutor, quizzes, notes, flashcards, grading, embeddings) require a
> valid `OPENAI_API_KEY` in your pulled env. Everything else works without it.

---

## Common commands

All `npm` commands are run from the `frontend/` directory unless noted.

### Development

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at http://localhost:3000 (Turbopack) |
| `npm run build` | Production build — the typecheck / correctness gate (no test suite) |
| `npm run start` | Serve the production build locally (run `build` first) |
| `npm run lint` | ESLint |

### Database

| Command | What it does |
|---------|--------------|
| `npm run db:setup` | Apply all `scripts/*.sql` to Aurora in order — idempotent, safe to re-run. Reads env from the repo-root `.env.development.local` |

### Environment

| Command (where to run) | What it does |
|------------------------|--------------|
| `vercel env pull .env.local --environment=development` (in `frontend/`) | Refresh the **dev server** env — AWS/PG IAM vars, `OPENAI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, fresh OIDC token. Needed when DB calls start returning auth errors (~12 h TTL). |
| `vercel env pull .env.development.local --environment=development` (in **repo root**) | Refresh the **`db:setup`** env — same vars but written to the repo-root file that `run-sql.mjs` reads. |
| `vercel dev` (in `frontend/`) | Dev server that **auto-refreshes** the OIDC token — avoids the 12 h re-pull gotcha. Slower to start than `npm run dev`. |

> Add `--yes` to any `vercel env pull` to skip the "overwrite existing file?" prompt.

---

## Troubleshooting

- **`ExpiredTokenException` / auth errors on DB calls, or `/api/health` returns
  `database: "disconnected"`** — the pulled `VERCEL_OIDC_TOKEN` has expired
  (~12 h TTL). Refresh the file for whichever workflow failed (see
  [Two env files](#️-two-env-files--they-dont-share-a-token)):
  - **dev server / app routes** → `vercel env pull .env.local --environment=development` (in `frontend/`), then restart the dev server — or use `vercel dev`, which auto-refreshes.
  - **`db:setup`** → `vercel env pull .env.development.local --environment=development` (in the repo root).
- **`OPENAI_API_KEY is not set`** — your env wasn't pulled, or the key is missing
  from the Vercel project. AI routes throw this until the key is present.
- **Build succeeds but pages serve 404 on Vercel** — `frontend/vercel.json` must
  declare `"framework": "nextjs"`; the Vercel project root is `frontend/`.
- **Can't pull env at all** — you likely lack access to the `edsynapse-beta`
  Vercel project. Local dev against the real DB isn't possible without it.

---

## Deployment

Pushing to `main` deploys via Vercel. The project **Root Directory must be set to
`frontend/`** (without it the build runs from the repo root, produces no output,
and every route 404s). All env — the AWS/PG IAM set, `OPENAI_API_KEY`,
`OPENAI_MODEL`, `RESEND_API_KEY`, `EMAIL_FROM`, and optional `NEXT_PUBLIC_APP_URL`
— is configured per-environment in the Vercel project. See
[`CLAUDE.md`](CLAUDE.md#deployment) for details.
