# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js (App Router) MVP for a tuition center to assign learning content to students. Admins manage students, groups, syllabus content, recordings, solution materials, exams, access grants, audit logs, and tags. Students only see published content they have permission to access. Backed by Supabase (Postgres + Auth + Storage), with an OpenAI-powered exam intake/transcription pipeline.

Detailed behavioral docs live in `documentation.md` (architecture/permissions/workflows) and `ADMIN_USAGE_GUIDE.md` (client-facing admin instructions). Read these for feature-level detail before making changes to permissions, exams, or storage.

## Commands

```bash
npm run dev              # start dev server (http://localhost:3000)
npm run lint              # eslint, --max-warnings=0
npm run typecheck         # tsc --noEmit
npm test                  # vitest run tests/unit tests/integration
npm run test:watch        # vitest watch mode
npm run test:e2e          # starts dev server, runs Playwright, stops server
npm run test:e2e:live      # Playwright against deployed UAT
npm run build             # production build
npm run db:check          # check migrations
npm run db:live           # apply migrations + seed to live Supabase (SUPABASE_DB_URL)
npm run db:create-uat-users
npm run db:verify-uat-users
npm run db:verify-live
npm run template:students # regenerate the student import .xlsx template
```

Run a single test file:

```bash
npx vitest run tests/unit/permissions.test.ts
```

## Local Setup

1. `npm install`
2. `cp .env.example .env.local`
3. With blank Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), the app runs in **local demo mode** outside production. Demo users: `student@example.com` / `admin@example.com`, any non-empty password.
4. Exam AI features need `OPENAI_API_KEY` and `OPENAI_EXAM_MODEL`.

## Architecture

### Repo Structure

- `src/app` — Next.js routes, grouped by route group: `(admin)/admin/**`, `(student)/**`, `(auth)/**`, plus `api/**`.
- `src/components` — UI primitives (`ui/`), layout shells (`layout/`), admin UI (`admin/`), content rendering (`content/`).
- `src/features` — server actions and validation (`features/admin/actions.ts`, `features/admin/students.ts`, `features/admin/student-import.ts`, `features/auth/*`).
- `src/lib` — cross-cutting concerns: `auth/` (session, roles, redirects), `permissions/` (the central access resolver), `exams/` (AI, HTML, images, signed uploads, validation, asset handling), `storage/`, `search/`, `activity/`, `audit/`, `supabase/`.
- `src/server/data/app-data.ts` — server-side data loaders.
- `src/types/domain.ts` — shared domain types.
- `supabase/migrations/` — numbered SQL migrations (currently up to `0007_multi_mode_exam_upload.sql`); `supabase/seed.sql` — seed data.
- `tests/unit`, `tests/integration` — Vitest; `tests/e2e` — Playwright.
- `scripts/` — local/live Supabase verification and import-template generation helpers.

### Auth & Roles

- Roles: `student`, `teacher`, `admin`, `super_admin`. Role/session helpers: `src/lib/auth/session.ts`, `src/lib/auth/roles.ts`, `src/lib/auth/redirects.ts`.
- `/admin/**` requires `teacher`/`admin`/`super_admin`; student routes require `student`. Logged-out users redirect to `/login`; unauthorized users redirect to `/access-denied`.
- Supabase sessions are used when Supabase env vars are set; otherwise demo mode uses a `demo_user_id` HTTP-only cookie.
- New students (manual or import) get `profiles.must_change_password = true` and are forced to `/account` until they change it. Failed profile/role writes during creation trigger cleanup of the newly-created Auth user.

### Permission Model

Central resolver: `src/lib/permissions/index.ts`. Access requires an active user, a published resource with published ancestors, and an active, non-revoked grant (direct user grant or active group grant) with a matching permission (`view` or `download`; `download` implies `view`).

Content hierarchy and inheritance:

```text
Year -> Subject -> Chapter -> Question -> recordings/materials
```

Grants can target any level (year/subject/chapter/question/recording/solution material) and are scoped by grantee type (user or group), with optional start/expiry dates.

### Exam Intake (Multi-Mode)

This is the most complex subsystem — see `documentation.md` ("Exam Intake And Review") before changing it. Three intake modes, chosen at creation and immutable:

- `ai_solved` — single PDF; AI transcribes questions and writes worked Markdown answers.
- `teacher_html` — PDF + a strict answer HTML file (one `<section data-question-number="...">` per question, local images only as `assets/filename.png`, KaTeX via `<span data-math>`/`<div data-math-display>`); AI transcribes questions only and must not answer them.
- `handwritten_images` — question groups with ordered question/answer images, no AI transcription.

Key pieces:
- `src/lib/exams/signed-upload.ts`, `validation.ts` — generic signed uploads to the private `exam-assets` bucket (legacy PDFs may live in `exam-sources`), file-type/size limits.
- `src/lib/exams/images.ts`, `client-assets.ts` — image normalization to stripped WebP (max 2400px, quality 88); staff-only originals retained. PDF-mode visuals can be cropped from the source PDF or uploaded as custom images, then placed before content, after content, or inline.
- `src/lib/exams/html.ts` — teacher-HTML sanitization/validation rules.
- `src/lib/exams/ai.ts` — OpenAI transcription/answering; `src/app/api/webhooks/openai` and status polling share one idempotent DB finalizer (`exam_processing_runs` tracks every attempt).
- Exam lifecycle: `draft` -> `review` -> `published` -> `archived` (separate from processing status `idle`/`processing`/`completed`/`failed`). Processing completion, publication, and reviewed-question updates use DB transactions. Published exams are immutable.
- Students see only reviewed questions/answers, rendered via Markdown/KaTeX or sanitized HTML/KaTeX with protected asset routes, watermarking, and copy/print deterrence (not real DRM). Source PDF route requires admin role.

### Storage

Private Supabase Storage buckets: `solution-materials` (PDF/DOCX/PNG/JPEG, max 25MB) and `exam-assets`/`exam-sources`. Student access goes through `/api/materials/[materialId]/signed-url` (10-minute signed URLs), which checks auth, the permission resolver, the download flag, then logs activity.

### Database

Migrations are sequential SQL files in `supabase/migrations/`. Run `npm run db:check` to verify migrations are in order; `npm run db:live` applies migrations + seed against `SUPABASE_DB_URL`.
