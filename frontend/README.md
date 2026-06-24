# EdSynapse — Frontend

The EdSynapse **Next.js 15 (App Router)** application. It owns the UI, client
state, **and** the `/api` route handlers that make up the backend (raw SQL over
`pg` → Amazon Aurora PostgreSQL + pgvector, OpenAI). EdSynapse is a personalized
AI tutoring platform with teacher, student, and admin roles running a
**Diagnose → Teach + Check → Verify** learning loop.

> 👉 **For full local setup, running, and testing instructions, see the
> repository-root [`README.md`](../README.md).** This file is a quick reference.

See [`CLAUDE.md`](../CLAUDE.md) for architecture, the data model, and conventions,
and [`PRD.md`](../PRD.md) for the product spec.

## Quick start

```bash
cd frontend
npm install
vercel env pull .env.local --environment=development   # IAM/PG env + OPENAI_API_KEY (needs Vercel project access)
npm run dev                                             # http://localhost:3000
```

Health check (also verifies the DB connection):
`GET /api/health` → `{ "status": "ok", "database": "connected" }`.

> **Note:** the database uses **IAM auth via Vercel OIDC — there is no
> `DATABASE_URL` or password.** You must pull the env from the Vercel project.
> The pulled `VERCEL_OIDC_TOKEN` expires (~12 h); re-pull when DB calls start
> failing, or use `vercel dev` (auto-refreshes).

## Stack

- Next.js App Router · React 19 · TypeScript
- Tailwind CSS v4 · EdSynapse blue theme (`src/app/globals.css`)
- **Raw SQL over `pg`** (no ORM) → Amazon Aurora PostgreSQL + pgvector; DB access
  goes through `src/lib/db.ts`. Schema lives in `scripts/*.sql`.
- OpenAI (server-side) for quizzes, streaming tutor, assessments, grading, and
  RAG embeddings. Model config in `src/lib/openai.ts` (`OPENAI_MODEL` override).

The typed frontend↔backend API contract lives in `src/lib/edsynapseApi.ts`.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:3000 (Turbopack) |
| `npm run build` | Production build — the typecheck/correctness gate (no test suite) |
| `npm run start` | Serve the production build locally (run `build` first) |
| `npm run lint` | ESLint |
| `npm run db:setup` | Apply `scripts/*.sql` to Aurora in order (idempotent) — reads env from repo-root `.env.development.local` |

### Refreshing the environment

The `VERCEL_OIDC_TOKEN` in your pulled env expires after ~12 h. Re-pull whichever file is stale:

```bash
# Dev server (frontend/.env.local) — run in frontend/
vercel env pull .env.local --environment=development --yes

# db:setup (repo-root .env.development.local) — run in repo root
vercel env pull .env.development.local --environment=development --yes
```

Or use `vercel dev` instead of `npm run dev` — it auto-refreshes the token.
