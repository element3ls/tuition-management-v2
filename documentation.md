# Tuition Management System Documentation

## What This Is

Tuition Management System is a Next.js MVP for tuition centers to assign learning content to students. Admins manage students, groups, syllabus content, YouTube recordings, private solution files, access grants, audit logs, and tags. Students only see published content they can access.

Client-facing admin instructions live in `ADMIN_USAGE_GUIDE.md`.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill Supabase values in `.env.local` when using a real Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_EXAM_MODEL=gpt-5.4-mini
```

Blank Supabase values enable local demo mode outside production. Demo users:

- `student@example.com`
- `admin@example.com`

Any non-empty password works in demo mode.

## One-Command Dev Start

```bash
npm run dev
```

Open `http://127.0.0.1:3000` or `http://localhost:3000`.

Deployed app:

```text
https://tuition-management-v2.vercel.app
```

## Quality Commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run db:check
npm run db:live
```

`npm run test:e2e` starts a local Next.js dev server, runs Playwright, then stops the server.

`npm run db:live` applies migrations and seed data to the Supabase project configured by `SUPABASE_DB_URL`.

`npm run db:verify-live` verifies the live project has seeded auth users, profile/content rows, a private `solution-materials` bucket, and working signed URL creation.

## Database And Seeds

Migrations live in `supabase/migrations/`.

Seed data lives in `supabase/seed.sql` and creates:

- roles: student, teacher, admin, super_admin
- demo student and admin auth users
- one year, subject, chapter, question
- one group and membership
- one YouTube recording
- one solution material metadata row
- one group access grant

Apply with Supabase CLI or dashboard SQL tools for the target environment.

## Auth And Roles

Protected server helpers live in `src/lib/auth/session.ts`.

- `/admin/**` requires `teacher`, `admin`, or `super_admin`.
- Student routes require `student`.
- Logged-out users redirect to `/login`.
- Unauthorized users redirect to `/access-denied`.

Supabase sessions are used when Supabase env vars are present. Demo mode uses a local `demo_user_id` HTTP-only cookie.

## Admin CMS Workflows

Admin routes:

- `/admin`
- `/admin/users`
- `/admin/groups`
- `/admin/access`
- `/admin/content`
- `/admin/recordings`
- `/admin/materials`
- `/admin/exams`
- `/admin/tags`
- `/admin/audit-logs`

Admin actions live in `src/features/admin/actions.ts`. With Supabase configured, forms persist records using server-only service-role operations and write audit logs.

## Students, Groups, And Grants

Create students at `/admin/users`.

`admin` and `super_admin` users can also import new students from an `.xlsx` template at `/admin/users`. The required first-worksheet columns are `Name`, `Email`, `Temporary Password`, `Phone`, and `Guardian Name`; phone and guardian values may be blank. The browser reads the workbook and sends validated rows in small batches. Existing emails, duplicate emails, and invalid rows are skipped, and the import does not assign groups or access grants.

New students created manually or by import have `profiles.must_change_password = true` and are redirected to `/account` until they set a new password. Student creation audit records exclude temporary passwords, and failed profile or role writes trigger cleanup of the newly-created Auth user.

Create groups and add students to groups at `/admin/groups`.

Create access grants at `/admin/access`:

- grantee type: user or group
- resource type: year, subject, chapter, question, recording, solution material
- permission: view or download
- optional start and expiry dates

`download` implies `view`; `view` does not imply `download`.

## Syllabus Content

Create years, subjects, chapters, and questions at `/admin/content`.

Student content hierarchy:

```text
Year -> Subject -> Chapter -> Question
```

Only `published` content is visible to students. `draft` and `archived` content is denied server-side.

## YouTube Recordings

Create recordings at `/admin/recordings`.

Required fields:

- chapter
- title
- YouTube video ID
- status

Student recording pages embed YouTube unlisted videos at `/recordings/[recordingId]` after permission checks.

## Solution Materials

Upload materials at `/admin/materials`.

Allowed file types:

- PDF
- DOCX
- PNG
- JPEG

Maximum file size: 25 MB.

Files go to private Supabase Storage bucket `solution-materials`. Metadata is stored in `solution_materials`.

## Exam Intake And Review

Manage exams at `/admin/exams`.

Choose one intake mode:

- `ai_solved`: upload one PDF. AI transcribes the questions and creates worked Markdown answers.
- `teacher_html`: upload one PDF, one strict answer HTML file, and any local HTML images. AI transcribes questions only and is explicitly forbidden from answering them.
- `handwritten_images`: create question groups and upload ordered question and answer images without AI transcription.

All uploads use generic signed uploads to the private `exam-assets` bucket. Legacy PDF files may remain in `exam-sources`. Image uploads are retained as staff-only originals and normalized to stripped WebP display assets (maximum 2400 px, quality 88).

For PDF modes, open the exam after upload and start background processing. OpenAI webhook completion and status polling share one idempotent database finalizer. Reviewers can add, delete and reorder questions, edit mode-specific content, clear warnings, upload custom visuals, and crop graphs or diagrams from the source PDF with the PDF.js crop tool. Question and answer visuals can be placed before content, after content, or inline through editor-inserted visual markers.

Teacher HTML must contain exactly one `<section data-question-number="...">` per transcribed question. Local images use `assets/filename.png`; external, data, and blob URLs are rejected. Use `<span data-math>...</span>` or `<div data-math-display>...</div>` for KaTeX math.

Handwritten groups require at least one question image and one answer image before publication. In PDF modes, a question marked as requiring a visual needs a cropped visual unless the teacher explicitly marks the separate visual unnecessary.

The uploader may approve their own exam. Published exams are read-only and appear primarily on the subject page, with related links on each selected chapter page. Access inherits from the subject or year; a direct exam grant can be used for exceptional releases. Students receive only reviewed questions and answers; the source PDF route requires an admin role.

Student exam pages render Markdown/KaTeX, sanitized HTML/KaTeX, cropped visuals, and ordered handwritten images through protected asset routes. They include a personalized watermark, disable common copy/save/print interactions, hide protected content from print CSS, and log exam views. These controls discourage casual copying but cannot prevent screenshots, cameras, browser developer tools, or OCR.

Exam lifecycle states are `draft`, `review`, `published`, and `archived`. Processing status is tracked separately as `idle`, `processing`, `completed`, or `failed`, with every AI attempt retained in `exam_processing_runs`. A failed draft can be processed again. Processing completion, publication, and reviewed question updates use database transactions.

## Private Storage And Signed URLs

Student material pages call `/api/materials/[materialId]/signed-url`.

Server flow:

1. Require student auth.
2. Check permission resolver.
3. Check download flag when requesting download.
4. Create a short-lived signed URL.
5. Log material open/download activity.

Signed URL expiry is 10 minutes.

## Student Browsing

Student routes:

- `/dashboard`
- `/years/[yearId]`
- `/subjects/[subjectId]`
- `/chapters/[chapterId]`
- `/questions/[questionId]`
- `/recordings/[recordingId]`
- `/materials/[materialId]`
- `/exams/[examId]`
- `/search`

All content is loaded through server-side permission checks. Direct unauthorized URLs show access denied content or redirect safely.

## Search

Search route: `/search?q=keyword`

Search covers chapters, questions, recordings, transcripts, materials, and tags. Results are permission-filtered server-side.

## Permission Model

Core resolver: `src/lib/permissions/index.ts`.

Access requires:

- active user
- published resource and published ancestors
- active grant
- non-revoked grant
- direct user grant or active group grant
- matching permission

Inheritance:

```text
year -> subject -> chapter -> question -> recordings/materials
subject -> chapter -> question -> recordings/materials
chapter -> question -> recordings/materials
question -> related recordings/materials
recording -> recording only
solution_material -> material only
```

## Repo Structure

```text
src/app                 Next.js routes
src/components          UI and layout components
src/features            Feature actions and validation
src/lib                 Auth, permissions, storage, search, Supabase
src/server              Server data loaders
src/types               Shared domain types
supabase/migrations     Database schema
supabase/seed.sql       Seed data
tests/unit              Vitest unit tests
tests/e2e               Playwright smoke tests
scripts                 Local verification helpers
```

## Troubleshooting

- Login returns to `/login`: check Supabase auth env vars or use demo emails with non-empty password.
- Student sees no content: add student to a group and create an active access grant.
- Material URL denied: verify material is published, grant is active, and permission is `view` or `download`.
- Download button hidden: material must be `is_downloadable` and user needs `download` permission.
- Search missing content: content must be published and accessible.
- E2E browser missing: run `npx playwright install chromium`.
- Supabase storage errors: confirm `solution-materials` bucket exists and is private.

## Deployment Notes

Use separate Supabase projects for local, staging, and production when moving beyond MVP validation. Set environment variables per environment, run migrations, seed or create the first super admin, verify private buckets, then deploy the Next.js app to Vercel or the chosen host.

Current Vercel deployment is live at `https://tuition-management-v2.vercel.app`. Logged-out `/dashboard` and `/admin` requests redirect to `/login`, and deployed UAT passes with the dedicated UAT users.

For deployed UAT, run:

```bash
npm run db:create-uat-users
npm run test:e2e:live
```

UAT credentials are stored locally in `.supabase/uat-users.local.json` and should not be committed.
