alter table public.exam_assets
  add column if not exists placement text not null default 'after_content';

alter table public.exam_assets
  drop constraint if exists exam_assets_placement_check,
  add constraint exam_assets_placement_check
    check (placement in ('before_content', 'after_content', 'inline'));

create or replace function public.save_exam_review(
  p_exam_id uuid,
  p_questions jsonb,
  p_actor_id uuid,
  p_publish boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  asset_item jsonb;
  current_status text;
  current_mode text;
  v_question_id uuid;
  invalid_count integer;
begin
  select status, intake_mode
  into current_status, current_mode
  from public.exams
  where id = p_exam_id
  for update;

  if current_status is null then
    raise exception 'Exam not found.';
  end if;

  if current_status in ('published', 'archived') then
    raise exception 'Published or archived exams cannot be edited.';
  end if;

  if jsonb_array_length(p_questions) = 0 then
    raise exception 'At least one exam question is required.';
  end if;

  delete from public.exam_questions
  where exam_id = p_exam_id
    and id not in (
      select (value->>'id')::uuid
      from jsonb_array_elements(p_questions)
    );

  update public.exam_assets
  set question_id = null,
      student_visible = false
  where exam_id = p_exam_id
    and variant = 'display'
    and role in ('question_image', 'answer_image', 'question_visual', 'answer_visual');

  for item in select value from jsonb_array_elements(p_questions)
  loop
    v_question_id := (item->>'id')::uuid;

    if (
      current_mode = 'ai_solved'
      and (item->>'question_format' <> 'markdown' or item->>'answer_format' <> 'markdown')
    ) or (
      current_mode = 'teacher_html'
      and (item->>'question_format' <> 'markdown' or item->>'answer_format' <> 'html')
    ) or (
      current_mode = 'handwritten_images'
      and (item->>'question_format' <> 'image' or item->>'answer_format' <> 'image')
    ) then
      raise exception 'Question formats do not match the selected exam mode.';
    end if;

    insert into public.exam_questions (
      id,
      exam_id,
      question_number,
      question_text,
      answer_text,
      question_html,
      answer_html,
      question_format,
      answer_format,
      marks,
      source_pages,
      review_warning,
      sort_order,
      requires_visual,
      visual_not_needed
    )
    values (
      v_question_id,
      p_exam_id,
      item->>'question_number',
      nullif(item->>'question_text', ''),
      nullif(item->>'answer_text', ''),
      nullif(item->>'question_html', ''),
      nullif(item->>'answer_html', ''),
      item->>'question_format',
      item->>'answer_format',
      case when item->'marks' = 'null'::jsonb then null else (item->>'marks')::integer end,
      array(select jsonb_array_elements_text(item->'source_pages')::integer),
      nullif(item->>'review_warning', ''),
      (item->>'sort_order')::integer,
      coalesce((item->>'requires_visual')::boolean, false),
      coalesce((item->>'visual_not_needed')::boolean, false)
    )
    on conflict (id) do update
    set question_number = excluded.question_number,
        question_text = excluded.question_text,
        answer_text = excluded.answer_text,
        question_html = excluded.question_html,
        answer_html = excluded.answer_html,
        question_format = excluded.question_format,
        answer_format = excluded.answer_format,
        marks = excluded.marks,
        source_pages = excluded.source_pages,
        review_warning = excluded.review_warning,
        sort_order = excluded.sort_order,
        requires_visual = excluded.requires_visual,
        visual_not_needed = excluded.visual_not_needed
    where public.exam_questions.exam_id = p_exam_id;

    if not found then
      raise exception 'Exam question belongs to another exam.';
    end if;

    for asset_item in
      select value from jsonb_array_elements(coalesce(item->'assets', '[]'::jsonb))
    loop
      if (
        current_mode = 'handwritten_images'
        and asset_item->>'role' not in ('question_image', 'answer_image')
      ) or (
        current_mode in ('ai_solved', 'teacher_html')
        and asset_item->>'role' not in ('question_visual', 'answer_visual')
      ) then
        raise exception 'Question asset role does not match the selected exam mode.';
      end if;

      if (
        current_mode = 'handwritten_images'
        and coalesce(nullif(asset_item->>'placement', ''), 'after_content') = 'inline'
      ) then
        raise exception 'Handwritten exam image groups cannot use inline placement.';
      end if;

      update public.exam_assets
      set question_id = v_question_id,
          role = asset_item->>'role',
          sort_order = (asset_item->>'sort_order')::integer,
          placement = coalesce(nullif(asset_item->>'placement', ''), 'after_content'),
          alt_text = nullif(asset_item->>'alt_text', ''),
          student_visible = true
      where id = (asset_item->>'id')::uuid
        and exam_id = p_exam_id
        and variant = 'display'
        and upload_status = 'ready';

      if not found then
        raise exception 'Exam asset was not found or is not ready.';
      end if;
    end loop;
  end loop;

  update public.exams
  set status = 'review'
  where id = p_exam_id;

  if p_publish then
    select count(*) into invalid_count
    from public.exam_questions q
    where q.exam_id = p_exam_id
      and (
        nullif(trim(q.question_number), '') is null
        or q.review_warning is not null
        or (
          current_mode in ('ai_solved', 'teacher_html')
          and nullif(trim(coalesce(q.question_text, '')), '') is null
        )
        or (
          current_mode = 'ai_solved'
          and nullif(trim(coalesce(q.answer_text, '')), '') is null
        )
        or (
          current_mode = 'teacher_html'
          and nullif(trim(coalesce(q.answer_html, '')), '') is null
        )
        or (
          q.requires_visual
          and not q.visual_not_needed
          and not exists (
            select 1 from public.exam_assets a
            where a.question_id = q.id
              and a.student_visible
              and a.variant = 'display'
              and a.role in ('question_visual', 'answer_visual')
          )
        )
        or (
          current_mode = 'handwritten_images'
          and (
            not exists (
              select 1 from public.exam_assets a
              where a.question_id = q.id
                and a.student_visible
                and a.variant = 'display'
                and a.role = 'question_image'
            )
            or not exists (
              select 1 from public.exam_assets a
              where a.question_id = q.id
                and a.student_visible
                and a.variant = 'display'
                and a.role = 'answer_image'
            )
          )
        )
      );

    if invalid_count > 0 then
      raise exception 'Every question must satisfy the selected exam mode before publishing.';
    end if;

    update public.exams
    set status = 'published',
        approved_by = p_actor_id,
        approved_at = now(),
        published_at = now(),
        ai_error = null
    where id = p_exam_id;
  end if;
end;
$$;

revoke all on function public.save_exam_review(uuid, jsonb, uuid, boolean) from public, anon, authenticated;
grant execute on function public.save_exam_review(uuid, jsonb, uuid, boolean) to service_role;
