create extension if not exists pgcrypto;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'student@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Student"}',
    false
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Admin"}',
    false
  )
on conflict (id) do nothing;

insert into public.roles (name, description)
values
  ('student', 'Student portal user'),
  ('teacher', 'Teacher CMS user'),
  ('admin', 'Admin CMS user'),
  ('super_admin', 'Full CMS user')
on conflict (name) do update set description = excluded.description;

insert into public.profiles (id, email, full_name, is_active)
values
  ('00000000-0000-4000-8000-000000000001', 'student@example.com', 'Demo Student', true),
  ('00000000-0000-4000-8000-000000000002', 'admin@example.com', 'Demo Admin', true)
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, is_active = excluded.is_active;

insert into public.user_roles (user_id, role_id)
select '00000000-0000-4000-8000-000000000001', id from public.roles where name = 'student'
on conflict do nothing;

insert into public.user_roles (user_id, role_id)
select '00000000-0000-4000-8000-000000000002', id from public.roles where name = 'super_admin'
on conflict do nothing;

insert into public.student_profiles (user_id, guardian_name, phone, notes)
values ('00000000-0000-4000-8000-000000000001', 'Demo Guardian', '+60120000000', 'Seed student for local testing.')
on conflict (user_id) do update set guardian_name = excluded.guardian_name, phone = excluded.phone, notes = excluded.notes;

insert into public.content_groups (id, name, description, is_active)
values ('10000000-0000-4000-8000-000000000001', 'Year 7 Maths Alpha', 'Seed group for MVP testing.', true)
on conflict (id) do update set name = excluded.name, description = excluded.description, is_active = excluded.is_active;

insert into public.student_group_memberships (student_id, group_id, status, starts_at, expires_at)
values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'active', now() - interval '1 day', null)
on conflict (student_id, group_id) do update set status = excluded.status, starts_at = excluded.starts_at, expires_at = excluded.expires_at;

insert into public.years (id, name, description, sort_order, status, is_ai_indexable)
values ('20000000-0000-4000-8000-000000000001', 'Year 7', 'Lower secondary foundation year.', 1, 'published', true)
on conflict (id) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order, status = excluded.status;

insert into public.subjects (id, year_id, name, description, sort_order, status, is_ai_indexable)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Mathematics', 'Core mathematics lessons and worked examples.', 1, 'published', true)
on conflict (id) do update set name = excluded.name, description = excluded.description, status = excluded.status;

insert into public.chapters (id, subject_id, title, description, sort_order, status, is_ai_indexable)
values ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Linear Equations', 'Solving one-variable equations step by step.', 1, 'published', true)
on conflict (id) do update set title = excluded.title, description = excluded.description, status = excluded.status;

insert into public.questions (id, chapter_id, title, question_text, description, sort_order, status, is_ai_indexable)
values ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Balancing Equations', 'Solve 2x + 5 = 17.', 'Worked algebra question.', 1, 'published', true)
on conflict (id) do update set title = excluded.title, question_text = excluded.question_text, description = excluded.description, status = excluded.status;

insert into public.recordings (id, chapter_id, question_id, title, description, youtube_video_id, duration_seconds, recorded_at, transcript_text, transcript_source, transcript_review_status, status, is_ai_indexable, created_by)
values ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Solving 2x + 5 = 17', 'Teacher walkthrough for balancing equations.', 'dQw4w9WgXcQ', 420, now(), 'Move 5 to the other side, then divide by 2.', 'manual', 'approved', 'published', true, '00000000-0000-4000-8000-000000000002')
on conflict (id) do update set title = excluded.title, description = excluded.description, status = excluded.status;

insert into public.solution_materials (id, chapter_id, question_id, title, description, storage_bucket, file_key, file_name, mime_type, file_size_bytes, is_downloadable, status, is_ai_indexable, uploaded_by)
values ('70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Linear Equations Solution Sheet', 'PDF solution notes for the demo question.', 'solution-materials', 'organizations/01000000-0000-4000-8000-000000000001/materials/demo/linear-equations-solution.pdf', 'linear-equations-solution.pdf', 'application/pdf', 24576, true, 'published', true, '00000000-0000-4000-8000-000000000002')
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    file_key = excluded.file_key,
    status = excluded.status;

insert into public.exams (
  id, subject_id, title, description, source_bucket, source_key, source_file_name, source_mime_type,
  source_size_bytes, intake_mode, status, processing_status, ai_model, uploaded_by, approved_by, approved_at, published_at
)
values (
  '72000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'Linear Equations Practice Exam',
  'Reviewed questions and worked answers.',
  'exam-sources',
  'organizations/01000000-0000-4000-8000-000000000001/exams/72000000-0000-4000-8000-000000000001/raw/demo/linear-equations-exam.pdf',
  'linear-equations-exam.pdf',
  'application/pdf',
  32768,
  'ai_solved',
  'published',
  'completed',
  'gpt-5.4-mini',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  now(),
  now()
)
on conflict (id) do update
set title = excluded.title,
    subject_id = excluded.subject_id,
    description = excluded.description,
    intake_mode = excluded.intake_mode,
    status = excluded.status,
    processing_status = excluded.processing_status,
    source_key = excluded.source_key,
    approved_by = excluded.approved_by,
    approved_at = excluded.approved_at,
    published_at = excluded.published_at;

insert into public.exam_chapters (exam_id, chapter_id)
values (
  '72000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001'
)
on conflict (exam_id, chapter_id) do nothing;

insert into public.exam_questions (
  id, exam_id, question_number, question_text, answer_text, question_format, answer_format,
  marks, source_pages, requires_visual, visual_not_needed, sort_order
)
values
  (
    '73000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    '1',
    'Solve $2x + 5 = 17$.',
    'Subtract 5 from both sides: $2x = 12$. Divide by 2: $\boxed{x = 6}$.',
    'markdown',
    'markdown',
    2,
    array[1],
    false,
    false,
    1
  ),
  (
    '73000000-0000-4000-8000-000000000002',
    '72000000-0000-4000-8000-000000000001',
    '2',
    'Solve $3(x - 2) = 15$.',
    'Divide by 3: $x - 2 = 5$. Add 2: $\boxed{x = 7}$.',
    'markdown',
    'markdown',
    2,
    array[1],
    false,
    false,
    2
  )
on conflict (id) do update
set question_number = excluded.question_number,
    question_text = excluded.question_text,
    answer_text = excluded.answer_text,
    question_format = excluded.question_format,
    answer_format = excluded.answer_format,
    marks = excluded.marks,
    source_pages = excluded.source_pages,
    requires_visual = excluded.requires_visual,
    visual_not_needed = excluded.visual_not_needed,
    sort_order = excluded.sort_order;

insert into public.exam_assets (
  id, exam_id, role, variant, storage_bucket, storage_key, file_name, mime_type, size_bytes,
  upload_status, student_visible, uploaded_by
)
values (
  '74000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001',
  'source_pdf',
  'raw',
  'exam-sources',
  'organizations/01000000-0000-4000-8000-000000000001/exams/72000000-0000-4000-8000-000000000001/raw/demo/linear-equations-exam.pdf',
  'linear-equations-exam.pdf',
  'application/pdf',
  32768,
  'ready',
  false,
  '00000000-0000-4000-8000-000000000002'
)
on conflict (storage_bucket, storage_key) do update
set storage_bucket = excluded.storage_bucket,
    storage_key = excluded.storage_key,
    upload_status = excluded.upload_status;

insert into public.exam_processing_runs (
  id, exam_id, mode, status, model, response_id, started_by, started_at, completed_at
)
values (
  '75000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001',
  'ai_solved',
  'completed',
  'gpt-5.4-mini',
  'demo-exam-response',
  '00000000-0000-4000-8000-000000000002',
  now(),
  now()
)
on conflict (id) do update
set status = excluded.status,
    model = excluded.model,
    completed_at = excluded.completed_at;

insert into public.access_grants (id, grantee_type, grantee_id, resource_type, resource_id, permission, starts_at, expires_at, granted_by)
values ('80000000-0000-4000-8000-000000000001', 'group', '10000000-0000-4000-8000-000000000001', 'year', '20000000-0000-4000-8000-000000000001', 'download', now() - interval '1 day', null, '00000000-0000-4000-8000-000000000002')
on conflict (id) do update set permission = excluded.permission, revoked_at = null, revoked_by = null;

insert into public.tags (id, name, slug)
values ('90000000-0000-4000-8000-000000000001', 'Algebra', 'algebra')
on conflict (id) do update set name = excluded.name, slug = excluded.slug;

insert into public.content_tags (tag_id, resource_type, resource_id)
values ('90000000-0000-4000-8000-000000000001', 'chapter', '40000000-0000-4000-8000-000000000001')
on conflict do nothing;
