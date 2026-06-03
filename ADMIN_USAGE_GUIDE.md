# Admin Usage Guide

## Production Access

Production URL:

```text
https://tuition-management-v2.vercel.app
```

Admin area:

```text
https://tuition-management-v2.vercel.app/admin
```

Use the admin email created for the Supabase production project. If a password is unknown, use the forgot-password flow from `/login`.

Do not commit passwords, service-role keys, or UAT credentials. Local UAT credentials are stored only in `.supabase/uat-users.local.json`.

## Admin Dashboard

The dashboard at `/admin` shows current counts for students, groups, syllabus content, recordings, and solution materials.

Use the sidebar to manage:

- Students
- Groups
- Access
- Content
- Recordings
- Materials
- Tags
- Audit logs

## Manage Students

Go to `/admin/users`.

Use this page to:

- Create a student record.
- Import new student records from an `.xlsx` workbook.
- Edit student details.
- Deactivate a student.
- Review student status.

The batch import is available only to `admin` and `super_admin` users. It reads the first worksheet only. Download the template from the import dialog and keep these columns unchanged:

```text
Name | Email | Temporary Password | Phone | Guardian Name
```

`Name`, `Email`, and `Temporary Password` are required. `Phone` and `Guardian Name` values are optional, but their columns must remain in the workbook. Imports create new students only: existing emails, duplicate workbook emails, and invalid rows are skipped. The completion report shows how many rows were imported, how many were skipped, and the reason for each skipped row.

The import does not assign groups or access grants. New students must change their temporary password after login. Treat completed workbooks as sensitive because they contain passwords, and keep the import dialog open until all rows are processed.

After creating a student, add the student to a group or create a direct access grant. Without access, the student can log in but will not see assigned content.

## Manage Groups

Go to `/admin/groups`.

Use groups for normal class or cohort access. A student can belong to multiple groups.

Typical flow:

1. Create a group.
2. Add students to the group.
3. Grant the group access to a year, subject, chapter, question, recording, or solution material.

Inactive memberships do not grant access.

## Manage Syllabus Content

Go to `/admin/content`.

Content hierarchy:

```text
Year -> Subject -> Chapter -> Question
```

Create parent records before child records. For example, create a year before a subject, and create a subject before a chapter.

Student visibility rules:

- `published` content can appear to authorized students.
- `draft` content is hidden.
- `archived` content is hidden.

Use sort order to control display order.

## Add YouTube Recordings

Go to `/admin/recordings`.

Required fields:

- Chapter
- Title
- YouTube video ID
- Status

Use only the YouTube video ID, not the full URL. Example:

```text
dQw4w9WgXcQ
```

Publish the recording and grant access through a parent resource or directly to the recording.

## Upload Solution Materials

Go to `/admin/materials`.

Allowed file types:

- PDF
- DOCX
- PNG
- JPEG

Maximum file size: 25 MB.

Files are stored in the private Supabase `solution-materials` bucket. Students receive short-lived signed URLs only after permission checks.

To allow downloading, mark the material downloadable and grant `download` permission. `download` implies `view`; `view` alone does not imply download.

## Grant Access

Go to `/admin/access`.

Access can be granted to:

- User
- Group

Resource types:

- Year
- Subject
- Chapter
- Question
- Recording
- Solution material

Normal recommendation: grant groups access to a year, subject, or chapter. Use direct user grants only for exceptions.

Access can have start and expiry dates. Revoked, expired, or future grants do not grant access.

## Test Student View

Recommended smoke test after content changes:

1. Log in as admin and create or update content.
2. Confirm content is `published`.
3. Confirm student belongs to a group.
4. Confirm group has active access grant.
5. Log out.
6. Log in as student.
7. Check `/dashboard`.
8. Open assigned recording or material.
9. Search for a known keyword.

Students should never see unauthorized content from dashboard, search, or direct URL.

## Audit Logs

Go to `/admin/audit-logs`.

Sensitive admin actions write audit records, including user changes, group changes, access grants, content updates, recording changes, and material uploads.

Use audit logs to confirm who changed what and when.

## Common Fixes

Student logs in but sees no content:

- Add student to an active group.
- Create an active access grant.
- Confirm content is `published`.

Recording does not appear:

- Confirm recording status is `published`.
- Confirm parent chapter/question is also published.
- Confirm access grant covers the recording or parent content.

Material signed URL is denied:

- Confirm material is published.
- Confirm private bucket exists.
- Confirm student has `view` permission.
- Confirm download requires `download` permission and material is downloadable.

Admin cannot access `/admin`:

- Confirm user has `teacher`, `admin`, or `super_admin` role in Supabase.
- Confirm Vercel environment variables point to the expected Supabase project.

Production behaves differently from local:

- Re-run deployed UAT after manual deployment.
- Confirm Vercel has latest environment variables.
- Confirm migrations were applied to the same Supabase project used by Vercel.
