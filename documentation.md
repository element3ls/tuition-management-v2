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
- `/admin/tags`
- `/admin/audit-logs`

Admin actions live in `src/features/admin/actions.ts`. With Supabase configured, forms persist records using server-only service-role operations and write audit logs.

## Students, Groups, And Grants

Create students at `/admin/users`.

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
