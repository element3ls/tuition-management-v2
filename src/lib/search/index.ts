import { canAccessResource } from "@/lib/permissions";
import { bySortOrderThenName } from "@/lib/sorting";
import type { AppData, SearchResult } from "@/types/domain";

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function includesQuery(values: Array<string | null | undefined>, query: string) {
  const needle = normalize(query).trim();
  if (!needle) return false;
  return values.some((value) => normalize(value).includes(needle));
}

function chapterContext(data: AppData, chapterId: string) {
  const chapter = data.chapters.find((item) => item.id === chapterId);
  const subject = chapter ? data.subjects.find((item) => item.id === chapter.subject_id) : null;
  const year = subject ? data.years.find((item) => item.id === subject.year_id) : null;
  return [year?.name, subject?.name, chapter?.title].filter(Boolean).join(" / ");
}

function subjectContext(data: AppData, subjectId: string) {
  const subject = data.subjects.find((item) => item.id === subjectId);
  const year = subject ? data.years.find((item) => item.id === subject.year_id) : null;
  return [year?.name, subject?.name].filter(Boolean).join(" / ");
}

function tagsFor(data: AppData, resourceType: SearchResult["type"], resourceId: string) {
  const tagIds = data.contentTags
    .filter((contentTag) => contentTag.resource_type === resourceType && contentTag.resource_id === resourceId)
    .map((contentTag) => contentTag.tag_id);

  return data.tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name);
}

export async function searchAccessibleContent(input: { userId: string; query: string; data: AppData; organizationId?: string }) {
  const { userId, query, data } = input;
  const organizationId = input.organizationId ?? data.organizations[0]?.id;
  const results: SearchResult[] = [];

  for (const chapter of data.chapters.sort(bySortOrderThenName)) {
    if (!includesQuery([chapter.title, chapter.description, ...tagsFor(data, "chapter", chapter.id)], query)) continue;
    if (!(await canAccessResource({ userId, resourceType: "chapter", resourceId: chapter.id, permission: "view", organizationId }, data))) continue;
    results.push({
      type: "chapter",
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      href: `/chapters/${chapter.id}`,
      context: chapterContext(data, chapter.id)
    });
  }

  for (const question of data.questions.sort(bySortOrderThenName)) {
    if (!includesQuery([question.title, question.description, question.question_text, ...tagsFor(data, "question", question.id)], query)) continue;
    if (!(await canAccessResource({ userId, resourceType: "question", resourceId: question.id, permission: "view", organizationId }, data))) continue;
    results.push({
      type: "question",
      id: question.id,
      title: question.title,
      description: question.description ?? question.question_text,
      href: `/questions/${question.id}`,
      context: chapterContext(data, question.chapter_id)
    });
  }

  for (const recording of data.recordings.sort(bySortOrderThenName)) {
    if (
      !includesQuery(
        [recording.title, recording.description, recording.transcript_text, ...tagsFor(data, "recording", recording.id)],
        query
      )
    ) {
      continue;
    }
    if (!(await canAccessResource({ userId, resourceType: "recording", resourceId: recording.id, permission: "view", organizationId }, data))) continue;
    results.push({
      type: "recording",
      id: recording.id,
      title: recording.title,
      description: recording.description,
      href: `/recordings/${recording.id}`,
      context: chapterContext(data, recording.chapter_id)
    });
  }

  for (const material of data.solutionMaterials.sort(bySortOrderThenName)) {
    if (
      !includesQuery([material.title, material.description, material.file_name, ...tagsFor(data, "solution_material", material.id)], query)
    ) {
      continue;
    }
    if (
      !(await canAccessResource({
        userId,
        resourceType: "solution_material",
        resourceId: material.id,
        permission: "view",
        organizationId
      }, data))
    ) continue;
    results.push({
      type: "solution_material",
      id: material.id,
      title: material.title,
      description: material.description,
      href: `/materials/${material.id}`,
      context: chapterContext(data, material.chapter_id)
    });
  }

  for (const exam of [...data.exams].sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))) {
    const examQuestions = data.examQuestions.filter((question) => question.exam_id === exam.id);
    if (
      !includesQuery(
        [
          exam.title,
          exam.description,
          ...examQuestions.flatMap((question) => [question.question_text, question.answer_text]),
          ...tagsFor(data, "exam", exam.id)
        ],
        query
      )
    ) {
      continue;
    }
    if (!(await canAccessResource({ userId, resourceType: "exam", resourceId: exam.id, permission: "view", organizationId }, data))) continue;
    results.push({
      type: "exam",
      id: exam.id,
      title: exam.title,
      description: exam.description,
      href: `/exams/${exam.id}`,
      context: subjectContext(data, exam.subject_id)
    });
  }

  return results.sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}
