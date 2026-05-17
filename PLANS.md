# PLANS.md — Tuition Management System MVP Implementation Plan

## 0. Purpose

This file is the implementation plan for Codex to build the Tuition Management System MVP.

The agreed MVP stack is:

```text
Next.js + TypeScript + Supabase Auth + Supabase PostgreSQL + Supabase Storage + YouTube unlisted embeds
```

The agreed product direction is:

- Students and admins must be able to log in.
- Students must only see assigned learning materials.
- Content must follow the hierarchy: Year → Subject → Chapter → Question.
- Admins need a simple CMS for students, groups, access rules, syllabus content, recordings, and solution materials.
- Recordings use YouTube unlisted embeds.
- Solution materials use private Supabase Storage with signed URLs.
- Access control uses a mixture of group-based access and fine-grained direct grants.
- AI chatbot is not part of MVP. Prepare lightweight AI-ready fields only.
- Lowest initial cost is preferred.
- CMS should be simple now, with room to enhance later.

---

## 1. Global Implementation Rules

### 1.1 Engineering Rules

- Use TypeScript throughout the application.
- Use server-side authorization for every protected action.
- Never rely on frontend hiding for access control.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Keep Supabase Storage buckets private.
- Generate signed URLs only after permission checks.
- Treat access control as deny-by-default.
- Prefer simple, maintainable code over premature abstractions.
- Keep the AI chatbot out of the MVP implementation except for AI-ready fields.

### 1.2 Security Rules

- Every admin route must require an admin-capable role.
- Every student content route must verify access server-side.
- Search results must be permission-filtered server-side.
- File access must use short-lived signed URLs.
- Unpublished content must never appear to students.
- Expired or future access grants must not grant access.
- Audit sensitive admin actions.

### 1.3 MVP Non-Goals

Do not implement these during MVP:

- Full AI chatbot.
- Payment gateway.
- Native secure video hosting.
- Mobile app.
- Complex CMS approval workflow.
- Advanced analytics dashboard.
- External vector database.
- Advanced learning recommendation engine.

---

## 2. Recommended Project Structure

Use the following structure unless an existing project structure already exists:

```text
src/
  app/
    (auth)/
      login/
      forgot-password/
      reset-password/
    (student)/
      dashboard/
      years/[yearId]/
      subjects/[subjectId]/
      chapters/[chapterId]/
      questions/[questionId]/
      recordings/[recordingId]/
      materials/[materialId]/
      search/
    (admin)/
      admin/
      admin/users/
      admin/groups/
      admin/access/
      admin/content/
      admin/recordings/
      admin/materials/
      admin/tags/
      admin/audit-logs/
  components/
    ui/
    layout/
    forms/
    tables/
  features/
    auth/
    students/
    groups/
    access/
    content/
    recordings/
    materials/
    search/
    audit/
    activity/
  lib/
    supabase/
    auth/
    permissions/
    storage/
    validation/
    audit/
  server/
    actions/
    queries/
  types/
```

---

## 3. Phase 1 — Project Foundation

### 3.1 Create Next.js App

#### Tasks

- Create a Next.js application with:
  - TypeScript.
  - App Router.
  - Tailwind CSS.
  - ESLint.
  - `src/` directory.
  - Import alias.
- Install required dependencies:

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install zod react-hook-form @hookform/resolvers
npm install clsx tailwind-merge
npm install lucide-react
npm install date-fns
```

- Initialize shadcn/ui if UI components are not yet configured:

```bash
npx shadcn@latest init
npx shadcn@latest add button input table dialog form select dropdown-menu badge card textarea tabs alert
```

#### Acceptance Criteria

- App runs locally.
- TypeScript build succeeds.
- Tailwind is working.
- shadcn/ui components are available.
- Folder structure follows the agreed layout.

---

### 3.2 Configure Supabase Environment

#### Tasks

- Add `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- Create Supabase clients:
  - Browser client.
  - Server client.
  - Middleware client.
  - Admin/service-role client for trusted server-only operations.

Suggested files:

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/middleware.ts
src/lib/supabase/admin.ts
```

#### Acceptance Criteria

- Browser can authenticate with Supabase anon key.
- Server can read authenticated user session.
- Service role client exists only in server-only code.
- No service role secret is imported into client components.

---

## 4. Phase 2 — Database Schema

### 4.1 Create Core Tables

Implement migrations for the following tables.

#### User and Role Tables

```text
profiles
roles
user_roles
student_profiles
```

Required intent:

- `profiles` extends Supabase auth users.
- `roles` stores role definitions.
- `user_roles` assigns one or more roles to a profile.
- `student_profiles` stores student-specific metadata.

Roles:

```text
student
teacher
admin
super_admin
```

#### Group and Membership Tables

```text
content_groups
student_group_memberships
```

Required intent:

- Groups are the default way to assign access.
- Students may belong to multiple groups.
- Memberships may be active, inactive, or time-bound.

#### Syllabus Tables

```text
years
subjects
chapters
questions
```

Hierarchy:

```text
years → subjects → chapters → questions
```

Required fields for content tables:

- `id`
- parent foreign key where applicable
- `name` or `title`
- `description`
- `sort_order`
- `status`
- `is_ai_indexable`
- `created_at`
- `updated_at`

Supported status values:

```text
draft
published
archived
```

#### Recording Tables

```text
recordings
```

Required fields:

- `id`
- `chapter_id`
- `question_id` nullable
- `title`
- `description`
- `youtube_video_id`
- `duration_seconds`
- `recorded_at`
- `transcript_text`
- `transcript_source`
- `transcript_review_status`
- `status`
- `is_ai_indexable`
- `created_by`
- `created_at`
- `updated_at`

Supported `transcript_source` values:

```text
none
manual
youtube
generated
```

Supported `transcript_review_status` values:

```text
draft
reviewed
approved
```

#### Solution Material Tables

```text
solution_materials
```

Required fields:

- `id`
- `chapter_id`
- `question_id` nullable
- `title`
- `description`
- `storage_bucket`
- `file_key`
- `file_name`
- `mime_type`
- `file_size_bytes`
- `is_downloadable`
- `status`
- `is_ai_indexable`
- `uploaded_by`
- `created_at`
- `updated_at`

#### Access Control Tables

```text
access_grants
```

Required fields:

- `id`
- `grantee_type`: `user` or `group`
- `grantee_id`
- `resource_type`: `year`, `subject`, `chapter`, `question`, `recording`, `solution_material`
- `resource_id`
- `permission`: `view` or `download`
- `starts_at`
- `expires_at`
- `granted_by`
- `revoked_at`
- `revoked_by`
- `created_at`

MVP rule:

- Do not implement explicit deny unless specifically required later.
- Use positive grants only.

#### Tag Tables

```text
tags
content_tags
```

Required intent:

- Tags support keyword discovery and later AI metadata.
- Tags can attach to chapters, questions, recordings, and solution materials.

#### Audit and Activity Tables

```text
audit_logs
activity_events
```

`audit_logs` records admin actions.

`activity_events` records student behavior such as login, search, video view, material open, and material download.

#### Acceptance Criteria

- All tables are created through migrations.
- Foreign keys are defined where appropriate.
- Status and enum-like fields are constrained.
- Seed data can be inserted successfully.

---

### 4.2 Seed Initial Data

#### Tasks

Seed the following:

- Roles:
  - Student.
  - Teacher.
  - Admin.
  - Super Admin.
- One test year, subject, chapter, and question.
- One test group.
- One test student profile.
- One test admin or super admin profile.

#### Acceptance Criteria

- Local environment has enough data to test login, CMS, access grants, and student browsing.

---

## 5. Phase 3 — Authentication and Role-Based Access

### 5.1 Implement Auth Pages

#### Routes

```text
/app/(auth)/login
/app/(auth)/forgot-password
/app/(auth)/reset-password
```

#### Tasks

- Implement login form.
- Implement forgot password form.
- Implement reset password form.
- Add form validation with Zod.
- Display clear error and success messages.

#### Login Redirect Rules

```text
student → /dashboard
teacher → /admin
admin → /admin
super_admin → /admin
```

#### Acceptance Criteria

- Users can log in.
- Users can log out.
- Users are redirected based on role.
- Invalid login attempts show clear errors.

---

### 5.2 Implement Route Protection

#### Tasks

Create auth helpers:

```ts
getCurrentUser()
getCurrentUserRoles()
requireAuth()
requireRole(roles: string[])
requireAdminAccess()
requireStudentAccess()
```

Add middleware for protected route groups.

#### Route Protection Rules

- `/admin/**` requires teacher, admin, or super_admin.
- `/dashboard` and student content routes require authenticated student access.
- Unauthenticated users are redirected to login.
- Unauthorized users receive an access-denied page or are redirected safely.

#### Acceptance Criteria

- Student cannot access `/admin`.
- Admin can access `/admin`.
- Logged-out users cannot access protected routes.
- Auth checks are enforced server-side.

---

## 6. Phase 4 — Permission Resolver

The permission resolver is the highest-risk MVP component. Build it before the student portal.

### 6.1 Implement Permission API

Create a central module:

```text
src/lib/permissions/
```

Required functions:

```ts
canAccessResource(params: {
  userId: string
  resourceType: 'year' | 'subject' | 'chapter' | 'question' | 'recording' | 'solution_material'
  resourceId: string
  permission: 'view' | 'download'
}): Promise<boolean>

getAccessibleResourceIds(params: {
  userId: string
  resourceType: 'year' | 'subject' | 'chapter' | 'question' | 'recording' | 'solution_material'
  permission: 'view' | 'download'
}): Promise<string[]>

getAccessibleContentTree(userId: string): Promise<AccessibleContentTree>
```

### 6.2 Permission Logic

A student can access a resource only when all conditions pass:

1. The resource is published.
2. The access grant is active.
3. The access grant is not revoked.
4. The grant is either:
   - directly assigned to the user, or
   - assigned to a group the student belongs to.
5. The grant applies either:
   - directly to the requested resource, or
   - through a parent resource.

Parent inheritance:

```text
year grants access to child subjects, chapters, questions, recordings, and materials
subject grants access to child chapters, questions, recordings, and materials
chapter grants access to child questions, recordings, and materials
question grants access to related recordings and materials
recording grants access to that recording only
solution_material grants access to that material only
```

### 6.3 Permission Tests

Write tests for:

- Student with no grants is denied.
- Student with group year grant can access child content.
- Student with group subject grant can access child chapters.
- Student with direct chapter grant can access that chapter.
- Student with direct recording grant can access that recording.
- Expired grant is denied.
- Future grant is denied.
- Revoked grant is denied.
- Draft content is denied.
- Archived content is denied.
- File view is allowed with `view` permission.
- File download requires `download` permission or a policy decision that `download` implies `view`.
- Student cannot access admin CMS.
- Admin-capable users can access CMS.

#### Acceptance Criteria

- All permission tests pass.
- Student portal, file access, search, and future AI retrieval can reuse the same permission module.

---

## 7. Phase 5 — Simple Admin CMS

### 7.1 Admin Shell

#### Routes

```text
/admin
/admin/users
/admin/groups
/admin/access
/admin/content
/admin/recordings
/admin/materials
/admin/tags
/admin/audit-logs
```

#### Tasks

- Build admin layout with sidebar navigation.
- Protect all admin routes.
- Show basic dashboard counts:
  - Students.
  - Groups.
  - Years.
  - Subjects.
  - Chapters.
  - Recordings.
  - Solution materials.

#### Acceptance Criteria

- Admin users can navigate CMS.
- Student users cannot access CMS.

---

### 7.2 Student Management

#### Features

- List students.
- Create student.
- Edit student.
- Deactivate student.
- View student groups.
- Add student to group.
- Remove student from group.

#### Acceptance Criteria

- Admin can manage student records.
- Admin actions are logged in `audit_logs`.

---

### 7.3 Group Management

#### Features

- List groups.
- Create group.
- Edit group.
- Activate/deactivate group.
- Add students.
- Remove students.
- View group access grants.

#### Acceptance Criteria

- Admin can manage student groups.
- Group membership affects permission resolver results.
- Admin actions are audited.

---

### 7.4 Access Management

#### Features

- List active access grants.
- Create access grant for user.
- Create access grant for group.
- Select resource type.
- Select resource.
- Select permission.
- Set start date.
- Set expiry date.
- Revoke access grant.

#### Acceptance Criteria

- Admin can grant group-based access.
- Admin can grant direct student access.
- Revoked grants stop access.
- Expired grants stop access.
- Changes are audited.

---

### 7.5 Syllabus CMS

#### Content Types

- Years.
- Subjects.
- Chapters.
- Questions.

#### Features

- List.
- Create.
- Edit.
- Archive.
- Publish/unpublish.
- Sort order.
- Parent selection.
- Optional tags.
- Optional AI-indexable flag.

#### Acceptance Criteria

- Admin can create the complete hierarchy.
- Student portal can read published hierarchy data.
- Draft and archived content are hidden from students.
- Changes are audited.

---

### 7.6 Recording Management

#### Features

- List recordings.
- Create recording.
- Edit recording.
- Archive recording.
- Publish/unpublish recording.
- Attach to chapter.
- Optionally attach to question.
- Store YouTube video ID.
- Store optional transcript text.
- Store transcript source.
- Store transcript review status.
- Mark AI-indexable.

#### Validation

- `youtube_video_id` is required.
- `chapter_id` is required.
- `question_id` is optional.
- `title` is required.
- `status` is required.

#### Acceptance Criteria

- Admin can add YouTube recordings.
- Student can only view published and authorized recordings.
- YouTube video is embedded on the student recording page.
- Changes are audited.

---

### 7.7 Solution Material Management

#### Features

- List solution materials.
- Upload material.
- Edit material metadata.
- Archive material.
- Publish/unpublish material.
- Attach to chapter.
- Optionally attach to question.
- Mark downloadable.
- Mark AI-indexable.

#### Acceptance Criteria

- Admin can upload files to Supabase Storage.
- Metadata is stored in `solution_materials`.
- Files are not publicly accessible.
- Changes are audited.

---

## 8. Phase 6 — Supabase Storage

### 8.1 Create Private Buckets

Create these Supabase Storage buckets:

```text
solution-materials
transcripts
admin-imports
```

MVP uses `solution-materials` first.

#### Acceptance Criteria

- Buckets exist.
- `solution-materials` bucket is private.
- Public access is not enabled for restricted materials.

---

### 8.2 Admin Upload Flow

#### Flow

```text
Admin selects file
→ Validate admin role
→ Validate file type and size
→ Upload to private Supabase Storage
→ Store metadata in solution_materials
→ Attach to chapter/question
→ Write audit log
```

#### File Validation

Initial allowed types:

```text
application/pdf
application/vnd.openxmlformats-officedocument.wordprocessingml.document
image/png
image/jpeg
```

Recommended initial maximum file size:

```text
25 MB
```

#### Acceptance Criteria

- Admin can upload allowed files.
- Disallowed files are rejected.
- Oversized files are rejected.
- Upload creates a database record.
- Upload creates an audit log.

---

### 8.3 Student Signed URL Flow

#### Flow

```text
Student requests material
→ Server checks authentication
→ Server checks permission resolver
→ Server creates signed URL
→ Server logs activity event
→ Student opens or downloads file
```

Signed URL expiry:

```text
5 to 15 minutes
```

#### Acceptance Criteria

- Authorized student receives signed URL.
- Unauthorized student receives access denied.
- Expired access grant prevents signed URL creation.
- Signed URL generation is server-side only.
- Activity event is logged.

---

## 9. Phase 7 — Student Portal

### 9.1 Student Dashboard

#### Route

```text
/dashboard
```

#### Sections

- Assigned subjects.
- Recently added accessible recordings.
- Recently added accessible solution materials.
- Continue learning from recent activity.
- Search bar.

#### Acceptance Criteria

- Dashboard shows only accessible content.
- Dashboard handles no-access state gracefully.

---

### 9.2 Hierarchical Browsing

#### Routes

```text
/years/[yearId]
/subjects/[subjectId]
/chapters/[chapterId]
/questions/[questionId]
```

#### Rules

- Check authentication.
- Check authorization.
- Load only published content.
- Load only accessible content.
- Never load all content and filter only on frontend.

#### Acceptance Criteria

- Student can browse Year → Subject → Chapter → Question.
- Unauthorized direct URL access is denied.
- Draft and archived content are hidden.

---

### 9.3 Recording Page

#### Route

```text
/recordings/[recordingId]
```

#### Page Content

- YouTube embed.
- Recording title.
- Description.
- Chapter/question context.
- Related authorized solution materials.
- Transcript if available.
- Access denied state if unauthorized.

#### Acceptance Criteria

- Authorized student can watch video.
- Unauthorized student cannot access page content.
- Related materials are permission-filtered.
- Activity event is logged for video view.

---

### 9.4 Solution Material Page

#### Route

```text
/materials/[materialId]
```

#### Page Content

- Material title.
- Description.
- File type.
- File size.
- Related chapter/question.
- View/download button.
- Access denied state if unauthorized.

#### Acceptance Criteria

- Authorized student can request a signed URL.
- Unauthorized student cannot request a signed URL.
- Activity event is logged for open/download.

---

## 10. Phase 8 — Keyword Search

### 10.1 Search Scope

Search over:

- Year name.
- Subject name.
- Chapter title.
- Question title.
- Question text.
- Recording title.
- Recording description.
- Solution material title.
- Solution material description.
- Tags.
- Transcript text if available.

### 10.2 Search Page

#### Route

```text
/search?q=
```

#### Result Groups

- Chapters.
- Questions.
- Recordings.
- Solution materials.

#### Critical Rule

Search must be permission-filtered server-side.

#### Acceptance Criteria

- Student sees only accessible search results.
- Unpublished content does not appear.
- Unauthorized direct links from search are impossible.
- Search events are logged.

---

## 11. Phase 9 — Audit Logs and Activity Tracking

### 11.1 Audit Logs

Log these admin actions:

- User created.
- User updated.
- User deactivated.
- Role changed.
- Group created.
- Group updated.
- Student added to group.
- Student removed from group.
- Access granted.
- Access revoked.
- Content created.
- Content updated.
- Content published.
- Content unpublished.
- Recording created.
- Recording updated.
- Material uploaded.
- Material archived.

#### Acceptance Criteria

- Audit logs are created for sensitive admin actions.
- Admin can view audit log list.
- Audit log records actor, action, resource, timestamp, and relevant before/after data.

---

### 11.2 Activity Events

Track these student events:

- Login.
- Recording viewed.
- Solution material opened.
- Solution material downloaded.
- Search performed.

#### Acceptance Criteria

- Student activity is recorded.
- Activity events can support future dashboard analytics.

---

## 12. Phase 10 — Testing and Quality Assurance

### 12.1 Unit Tests

Prioritize tests for:

- Permission resolver.
- Role checks.
- Signed URL authorization.
- Search filtering.
- Input validation.

#### Acceptance Criteria

- Unit tests pass locally and in CI.
- Permission resolver has strong coverage.

---

### 12.2 Integration Tests

Test these flows:

```text
login
create student
create group
assign student to group
grant group access
create syllabus content
create recording
upload file
generate signed URL
view authorized content
block unauthorized content
```

#### Acceptance Criteria

- Main backend flows work together.
- Access-control regressions are caught.

---

### 12.3 End-to-End Tests

Use Playwright for:

- Student logs in and sees dashboard.
- Student browses assigned subject.
- Student opens assigned recording.
- Student opens assigned material.
- Student searches keyword.
- Student cannot access admin URL.
- Student cannot access unauthorized material URL.
- Admin can create content and grant access.

#### Acceptance Criteria

- Critical user journeys pass in staging.

---

### 12.4 Security Checklist

Before production, verify:

- `solution-materials` bucket is private.
- Service role key is never available client-side.
- All admin routes are role-protected.
- All student content is server-filtered.
- Signed URLs expire.
- Unauthorized search results are blocked.
- Expired access grants are blocked.
- Future access grants are blocked.
- Unpublished content is hidden.
- Sensitive admin actions create audit logs.

#### Acceptance Criteria

- Security checklist is complete before production deployment.

---

## 13. Phase 11 — Staging and Production Deployment

### 13.1 Environments

Use separate environments:

```text
local
staging
production
```

Each environment should have:

- Separate Supabase configuration.
- Separate storage bucket configuration.
- Separate environment variables.
- Separate admin account.

### 13.2 Staging Deployment

#### Tasks

- Deploy app to Vercel or chosen host.
- Connect staging Supabase project.
- Run migrations.
- Seed test data.
- Create test users.
- Upload sample solution materials.
- Add sample YouTube recordings.
- Test access scenarios.

#### Acceptance Criteria

- Client can perform UAT in staging.

### 13.3 UAT Checklist

Client should validate:

- Students can log in.
- Admins can log in.
- Admin can create content.
- Admin can upload files.
- Admin can add YouTube recordings.
- Admin can create groups.
- Admin can grant access.
- Students see correct materials.
- Students cannot see unauthorized materials.
- YouTube embeds work.
- File signed URLs work.
- Search results are useful and permission-filtered.
- CMS is simple enough for operations.

### 13.4 Production Deployment

#### Production Checklist

- Production Supabase configured.
- Production storage buckets are private.
- Production environment variables are set.
- Database migrations are complete.
- First super admin is created.
- Backup policy is confirmed.
- Error tracking is enabled.
- Monitoring is enabled.
- Client domain is connected.
- SSL is active.

#### Acceptance Criteria

- Production MVP is live.
- Client can use admin CMS.
- Students can access assigned content.

---

## 14. Phase 12 — Post-MVP AI POC Preparation

Do not build full AI chatbot during MVP.

### 14.1 AI-Ready Data to Capture During MVP

Capture:

- Recording transcript text.
- Transcript source.
- Transcript review status.
- AI-indexable flags.
- Content hierarchy relationships.
- Access grants.

### 14.2 AI POC Scope After MVP

Recommended POC:

- One high-demand subject.
- One to two chapters.
- Five to ten recordings.
- Five to twenty solution files.
- Internal users first.
- Manual transcripts first.
- YouTube transcripts second.

### 14.3 Future AI POC Tasks

When AI POC begins:

1. Enable pgvector.
2. Create AI source document tables.
3. Chunk transcripts and solution materials.
4. Generate embeddings.
5. Build internal chatbot endpoint.
6. Retrieve only authorized chunks.
7. Generate answers using LLM API.
8. Show source references.
9. Log usage and cost.
10. Collect teacher feedback.

#### Acceptance Criteria

- AI POC is not blocking MVP.
- MVP data model supports future AI indexing.

---

## 15. Recommended Build Order

Implement in this order:

1. Project foundation.
2. Supabase setup.
3. Database schema and seed data.
4. Authentication and role checks.
5. Permission resolver.
6. Admin shell.
7. Student management.
8. Group management.
9. Access management.
10. Syllabus CMS.
11. Recording management.
12. Solution material management.
13. Supabase Storage upload flow.
14. Student signed URL flow.
15. Student dashboard.
16. Student hierarchical browsing.
17. Recording page.
18. Solution material page.
19. Keyword search.
20. Audit logs.
21. Activity tracking.
22. Unit tests.
23. Integration tests.
24. End-to-end tests.
25. Security review.
26. Staging deployment.
27. UAT fixes.
28. Production deployment.
29. Post-MVP AI POC preparation.

---

## 16. MVP Definition of Done

The MVP is complete only when all of the following are true:

1. Students can log in.
2. Admins can log in.
3. Admins can create years, subjects, chapters, and questions.
4. Admins can add YouTube recordings.
5. Admins can upload solution materials to Supabase Storage.
6. Admins can create student groups.
7. Admins can grant group access.
8. Admins can grant direct student access.
9. Students only see assigned content.
10. Students can watch assigned recordings.
11. Students can open or download assigned solution materials.
12. Students can search accessible materials.
13. Unauthorized users cannot access restricted content by direct URL.
14. File access uses private storage and signed URLs.
15. Admin actions are logged.
16. Student activity events are logged.
17. Permission resolver tests pass.
18. Critical E2E tests pass.
19. The app is deployed to production.
20. The client has received a short admin usage guide.

---

## 17. Codex Execution Checklist

Use this checklist while implementing.

### Foundation

- [x] Create Next.js app.
- [x] Install dependencies.
- [x] Configure Tailwind and UI components.
- [x] Configure Supabase clients.
- [x] Add environment variable examples.

### Database

- [x] Create migrations for profiles and roles.
- [x] Create migrations for students and groups.
- [x] Create migrations for syllabus hierarchy.
- [x] Create migrations for recordings.
- [x] Create migrations for solution materials.
- [x] Create migrations for access grants.
- [x] Create migrations for tags.
- [x] Create migrations for audit logs.
- [x] Create migrations for activity events.
- [x] Add seed data.

### Auth and Roles

- [x] Build login page.
- [x] Build forgot password page.
- [x] Build reset password page.
- [x] Build logout flow.
- [x] Implement role helpers.
- [x] Protect admin routes.
- [x] Protect student routes.

### Permissions

- [x] Implement `canAccessResource`.
- [x] Implement `getAccessibleResourceIds`.
- [x] Implement `getAccessibleContentTree`.
- [x] Add parent inheritance.
- [x] Add grant expiry handling.
- [x] Add revoked grant handling.
- [x] Add published-status checks.
- [x] Add permission tests.

### Admin CMS

- [x] Build admin layout.
- [x] Build admin dashboard.
- [x] Build student management.
- [x] Build group management.
- [x] Build access management.
- [x] Build year management.
- [x] Build subject management.
- [x] Build chapter management.
- [x] Build question management.
- [x] Build recording management.
- [x] Build solution material management.
- [x] Build tag management.
- [x] Build audit log page.

### Storage

- [x] Create private Supabase buckets.
- [x] Build admin upload flow.
- [x] Validate file type.
- [x] Validate file size.
- [x] Save file metadata.
- [x] Generate signed URL server-side.
- [x] Check permission before signed URL.
- [x] Log file activity events.

### Student Portal

- [x] Build dashboard.
- [x] Build year page.
- [x] Build subject page.
- [x] Build chapter page.
- [x] Build question page.
- [x] Build recording page.
- [x] Build solution material page.
- [x] Add access denied states.
- [x] Log recording views.
- [x] Log material opens/downloads.

### Search

- [x] Implement PostgreSQL full-text search.
- [x] Search hierarchy content.
- [x] Search recordings.
- [x] Search materials.
- [x] Search transcripts.
- [x] Filter results by permission.
- [x] Log search events.

### Testing and Release

- [x] Add unit tests.
- [x] Add integration tests.
- [x] Add Playwright tests.
- [x] Complete security checklist.
- [x] Deploy staging.
- [ ] Support UAT.
- [x] Deploy production.
- [ ] Create admin usage guide.

---

## 18. Implementation Notes

- 2026-05-17: Repository was empty except for `PLANS.md` and `IMPLEMENT.md`; Git was initialized before coding so milestone commits can be created.
- 2026-05-17: Project will be scaffolded manually instead of via `create-next-app` so the implementation can stay deterministic and aligned with the requested folder structure.
- 2026-05-17: If a live Supabase project is not available during local validation, migrations, seed SQL, server-side clients, and tests will be implemented so the app is ready once environment variables are provided.
- 2026-05-17: Local development may run in demo mode when Supabase environment variables are blank; demo mode uses deterministic in-memory fixtures and a `demo_user_id` cookie only outside production.
- 2026-05-17: Download permission policy is explicit: `download` implies `view`; `view` alone does not imply `download`.
- 2026-05-17: Deployment/UAT steps that require external accounts will be documented and prepared in code, with final live deployment blocked until Supabase/Vercel credentials are supplied.
- 2026-05-17: Do not run `next build` and Playwright E2E in parallel because both write `.next`; validation now runs them sequentially.
- 2026-05-17: Local validation passed: lint, typecheck, unit/integration tests, migration check, production build, and Playwright E2E.
- 2026-05-17: Live Supabase migrations and seed completed using `SUPABASE_DB_URL`; existing `student@example.com` and `admin@example.com` auth users were reused, so passwords were not changed. Demo PDF was uploaded to private `solution-materials` storage and signed URL creation was verified.
- 2026-05-17: Vercel deployment is reachable at `https://tuition-management-v2.vercel.app/login`; unauthenticated `/dashboard` and `/admin` requests redirect to `/login`. Full deployed login UAT still requires known passwords for the existing Supabase seed users.

---

## 19. Verification Checklist

- [x] `npm run dev` starts the app.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm run db:check` verifies required migration files.
- [x] Live Supabase migrations run cleanly.
- [x] Live Supabase seed data inserts cleanly.
- [x] `npm run db:verify-live` verifies live auth users, seeded content, private bucket, and signed URL creation.
- [x] Vercel login page is reachable.
- [x] Deployed protected routes redirect logged-out users to `/login`.
- [x] Permission resolver tests pass.
- [x] Signed URL authorization tests pass.
- [x] Search filtering tests pass.
- [x] Critical integration tests pass.
- [x] Critical Playwright/E2E tests pass.
- [x] Service role key is server-only.
- [x] Admin routes are role-protected.
- [x] Student routes are auth-protected.
- [x] Student content is server-filtered.
- [x] Search results are server-filtered.
- [x] Signed URLs expire and require permission checks.
- [x] Draft, archived, expired, future, and revoked resources are blocked.
- [x] Sensitive admin actions create audit logs.
- [x] Student activity events are recorded.

---

## 20. Important Notes for Future Enhancements

### YouTube Unlisted Risk

The MVP accepts YouTube unlisted video risk. Do not overbuild secure video protection now. Ensure access to the portal page is controlled, but understand that students may still share YouTube links after seeing them.

### AI Chatbot

Do not build the AI chatbot in the MVP. Keep only AI-ready fields. After MVP, implement a controlled RAG proof of concept using transcripts, solution files, Supabase pgvector, and strict permission-filtered retrieval.

### CMS Expansion

Keep the CMS simple for MVP. Future enhancements may include:

- Bulk imports.
- Approval workflows.
- Version history.
- Admin impersonation with audit logs.
- AI response review dashboard.
- Advanced analytics.
