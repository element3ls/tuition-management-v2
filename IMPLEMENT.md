# IMPLEMENT.md - Codex Execution Instructions

Now implement the entire Tuition Management System MVP end-to-end.

## Non-Negotiable Constraint

Do not stop after a milestone to ask questions or wait for confirmation.

Proceed through every phase and checklist item in `PLANS.md` until the whole MVP is complete, validated, documented, and ready for production handoff.

## Source Of Truth

Treat `PLANS.md` as the source of truth.

If anything is ambiguous:

1. Make a reasonable MVP-safe decision.
2. Record the decision in `PLANS.md` under an `Implementation Notes` section before coding.
3. Continue implementation without waiting for confirmation.

Do not implement features listed as MVP non-goals unless later instructions explicitly amend `PLANS.md`.

## Execution Rules

Follow these rules strictly:

- Implement deliberately with small, reviewable commits.
- Avoid bundling unrelated changes.
- If this directory is not yet a Git repository, initialize Git before coding so milestone commits can be created.
- Keep commits focused and reference the phase or milestone name from `PLANS.md`.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- Enforce access control server-side. Never rely on frontend hiding.
- Keep Supabase Storage buckets private.
- Generate signed URLs only after authentication and permission checks.
- Treat access control as deny-by-default.
- Keep AI chatbot out of MVP; only add the AI-ready fields described in `PLANS.md`.

## Required Milestone Loop

After every phase, milestone, or logically complete checklist section:

1. Run relevant verification commands:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - migration checks
   - seed checks
   - unit tests
   - integration tests
   - Playwright or E2E checks when relevant
2. Fix all failures immediately.
3. Add or update tests covering the milestone's core behavior.
4. Update `PLANS.md` checkboxes and notes so progress is accurate.
5. Update `documentation.md` if user-facing setup, commands, behavior, or structure changed.
6. Commit with a clear message referencing the milestone name.

If a verification command is not available yet, add the script when appropriate. If it is intentionally deferred, record why in `PLANS.md` under `Implementation Notes`.

## Bug Rule

If a bug is discovered at any point:

1. Write a failing test that reproduces it.
2. Fix the bug.
3. Confirm the test now passes.
4. Record a short note in `PLANS.md` under `Implementation Notes`.
5. Commit the test and fix together.

## Required Build Order

Implement in the order defined by `PLANS.md`:

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

Do not skip ahead unless a later item is required to validate the current milestone.

## Validation Requirements

Maintain a `Verification Checklist` section in `PLANS.md` that stays accurate as the repo evolves.

Minimum final validation:

- `npm run dev` works.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm test` passes.
- Database migrations run successfully.
- Seed data inserts successfully.
- Permission resolver tests pass.
- Critical integration tests pass.
- Critical Playwright/E2E tests pass.
- Security checklist in `PLANS.md` is complete.

Access-control validation must prove:

- Students cannot access `/admin`.
- Logged-out users cannot access protected routes.
- Students only see assigned, published content.
- Draft and archived content are hidden from students.
- Expired, future, or revoked grants do not grant access.
- Search results are permission-filtered server-side.
- Signed URLs are generated only for authorized users.
- Service role key is never imported into client/browser code.

## Determinism Requirements

Determinism is required for:

- Permission resolver output ordering.
- Accessible content tree ordering.
- Search result ordering.
- Audit log display ordering.
- Activity event display ordering.
- Seed data behavior.
- Snapshot-covered serialized outputs.

Use stable sorting and snapshot tests where ordering matters.

## Documentation Requirements

Create `documentation.md` early and keep it concise, accurate, and useful.

At the end, `documentation.md` must include:

- What the Tuition Management System is.
- Local setup.
- Environment variables.
- One-command dev start.
- How to run lint, typecheck, tests, migrations, and seeds.
- How auth and roles work.
- How admin CMS workflows work.
- How to create students, groups, and access grants.
- How to create syllabus content.
- How to add YouTube recordings.
- How to upload solution materials.
- How private Supabase Storage and signed URLs work.
- How students browse assigned content.
- How keyword search works.
- Repo structure overview.
- Database schema overview.
- Permission model overview.
- Troubleshooting section with top issues and fixes.
- Short admin usage guide for client handoff.

## Security Requirements

Before production, confirm:

- `solution-materials` bucket is private.
- Service role key is server-only.
- Admin routes require teacher, admin, or super_admin role.
- Student routes require authenticated student access.
- Content routes check permission server-side.
- File routes check permission before signed URL generation.
- Signed URLs expire.
- Search is filtered server-side.
- Unpublished content is hidden.
- Expired, future, and revoked grants are blocked.
- Sensitive admin actions create audit logs.
- Student activity events are logged.

## Completion Criteria

Do not stop until all are true:

- All phases in `PLANS.md` are implemented and checked off.
- Students can log in.
- Admins can log in.
- Admins can create years, subjects, chapters, and questions.
- Admins can add YouTube recordings.
- Admins can upload solution materials to private Supabase Storage.
- Admins can create student groups.
- Admins can grant group access.
- Admins can grant direct student access.
- Students only see assigned content.
- Students can watch assigned recordings.
- Students can open or download assigned solution materials.
- Students can search accessible materials.
- Unauthorized users cannot access restricted content by direct URL.
- File access uses private storage and signed URLs.
- Admin actions are logged.
- Student activity events are logged.
- Permission resolver tests pass.
- Critical integration tests pass.
- Critical E2E tests pass.
- Staging deployment is validated.
- Production deployment is complete.
- Client has a short admin usage guide in `documentation.md`.
- `npm run dev`, `npm run lint`, `npm run typecheck`, and `npm test` all pass.

Start now by reading `PLANS.md`, creating any missing `Implementation Notes` and `Verification Checklist` sections, then beginning Phase 1. Continue until the full MVP is finished.
