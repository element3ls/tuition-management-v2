import { afterEach, describe, expect, it, vi } from "vitest";
import { cloneDemoData, demoIds } from "@/lib/demo-data";
import { canAccessResource, getAccessibleContentTree, getAccessibleResourceIds } from "@/lib/permissions";
import { searchAccessibleContent } from "@/lib/search";
import { createMaterialSignedUrl } from "@/lib/storage/materials";
import type { AppData } from "@/types/domain";

const now = new Date("2026-05-17T00:00:00.000Z");

const secondTenant = {
  organization: "01000000-0000-4000-8000-000000000099",
  student: "00000000-0000-4000-8000-000000000099",
  group: "10000000-0000-4000-8000-000000000099",
  membership: "11000000-0000-4000-8000-000000000099",
  year: "20000000-0000-4000-8000-000000000099",
  subject: "30000000-0000-4000-8000-000000000099",
  chapter: "40000000-0000-4000-8000-000000000099",
  question: "50000000-0000-4000-8000-000000000099",
  recording: "60000000-0000-4000-8000-000000000099",
  material: "70000000-0000-4000-8000-000000000099",
  exam: "72000000-0000-4000-8000-000000000099",
  examQuestion: "73000000-0000-4000-8000-000000000099",
  examAsset: "74000000-0000-4000-8000-000000000099",
  examRun: "75000000-0000-4000-8000-000000000099",
  grant: "80000000-0000-4000-8000-000000000099",
  tag: "90000000-0000-4000-8000-000000000099",
  contentTag: "91000000-0000-4000-8000-000000000099"
} as const;

function buildMultiTenantData(): AppData {
  const data = cloneDemoData();

  data.organizations.push({
    ...data.organizations[0],
    id: secondTenant.organization,
    name: "Second Tuition Center",
    slug: "second-tuition-center"
  });
  data.profiles.push({
    ...data.profiles[0],
    id: secondTenant.student,
    email: "second-student@example.com",
    full_name: "Second Tenant Student"
  });
  data.userRoles.push({ user_id: secondTenant.student, role: "student" });
  data.organizationMemberships.push({
    organization_id: secondTenant.organization,
    user_id: secondTenant.student,
    role: "student",
    status: "active",
    created_at: "2026-05-17T00:00:00.000Z",
    updated_at: "2026-05-17T00:00:00.000Z"
  });
  data.studentProfiles.push({
    ...data.studentProfiles[0],
    organization_id: secondTenant.organization,
    user_id: secondTenant.student,
    guardian_name: "Second Tenant Guardian"
  });
  data.groups.push({
    ...data.groups[0],
    organization_id: secondTenant.organization,
    id: secondTenant.group,
    name: "Year 8 Maths Beta"
  });
  data.memberships.push({
    ...data.memberships[0],
    organization_id: secondTenant.organization,
    id: secondTenant.membership,
    student_id: secondTenant.student,
    group_id: secondTenant.group
  });
  data.years.push({
    ...data.years[0],
    organization_id: secondTenant.organization,
    id: secondTenant.year,
    name: "Year 8",
    sort_order: 2
  });
  data.subjects.push({
    ...data.subjects[0],
    organization_id: secondTenant.organization,
    id: secondTenant.subject,
    year_id: secondTenant.year,
    name: "Advanced Mathematics",
    sort_order: 2
  });
  data.chapters.push({
    ...data.chapters[0],
    organization_id: secondTenant.organization,
    id: secondTenant.chapter,
    subject_id: secondTenant.subject,
    title: "Quadratic Equations",
    description: "Solving second-degree equations.",
    sort_order: 2
  });
  data.questions.push({
    ...data.questions[0],
    organization_id: secondTenant.organization,
    id: secondTenant.question,
    chapter_id: secondTenant.chapter,
    title: "Factoring Quadratics",
    question_text: "Solve x^2 - 5x + 6 = 0.",
    sort_order: 2
  });
  data.recordings.push({
    ...data.recordings[0],
    organization_id: secondTenant.organization,
    id: secondTenant.recording,
    chapter_id: secondTenant.chapter,
    question_id: secondTenant.question,
    title: "Solving x^2 - 5x + 6 = 0",
    transcript_text: "Find two numbers that multiply to 6 and add to -5.",
    created_by: null
  });
  data.solutionMaterials.push({
    ...data.solutionMaterials[0],
    organization_id: secondTenant.organization,
    id: secondTenant.material,
    chapter_id: secondTenant.chapter,
    question_id: secondTenant.question,
    title: "Quadratic Equations Solution Sheet",
    file_key: `organizations/${secondTenant.organization}/materials/demo/quadratic-equations-solution.pdf`,
    file_name: "quadratic-equations-solution.pdf",
    uploaded_by: null
  });
  data.exams.push({
    ...data.exams[0],
    organization_id: secondTenant.organization,
    id: secondTenant.exam,
    subject_id: secondTenant.subject,
    title: "Quadratic Equations Practice Exam",
    source_key: `organizations/${secondTenant.organization}/exams/${secondTenant.exam}/raw/demo/quadratic-equations-exam.pdf`,
    source_file_name: "quadratic-equations-exam.pdf",
    uploaded_by: null,
    approved_by: null
  });
  data.examChapters.push({
    ...data.examChapters[0],
    organization_id: secondTenant.organization,
    exam_id: secondTenant.exam,
    chapter_id: secondTenant.chapter
  });
  data.examQuestions.push({
    ...data.examQuestions[0],
    organization_id: secondTenant.organization,
    id: secondTenant.examQuestion,
    exam_id: secondTenant.exam,
    question_text: "Solve x^2 - 5x + 6 = 0.",
    answer_text: "x = 2 or x = 3"
  });
  data.examAssets.push({
    ...data.examAssets[0],
    organization_id: secondTenant.organization,
    id: secondTenant.examAsset,
    exam_id: secondTenant.exam,
    storage_key: `organizations/${secondTenant.organization}/exams/${secondTenant.exam}/raw/demo/quadratic-equations-exam.pdf`,
    file_name: "quadratic-equations-exam.pdf",
    uploaded_by: null
  });
  data.examProcessingRuns.push({
    ...data.examProcessingRuns[0],
    organization_id: secondTenant.organization,
    id: secondTenant.examRun,
    exam_id: secondTenant.exam,
    started_by: null
  });
  data.accessGrants.push({
    ...data.accessGrants[0],
    organization_id: secondTenant.organization,
    id: secondTenant.grant,
    grantee_id: secondTenant.group,
    resource_id: secondTenant.year,
    granted_by: null
  });
  data.tags.push({
    ...data.tags[0],
    organization_id: secondTenant.organization,
    id: secondTenant.tag,
    name: "Quadratics",
    slug: "quadratics"
  });
  data.contentTags.push({
    ...data.contentTags[0],
    organization_id: secondTenant.organization,
    id: secondTenant.contentTag,
    tag_id: secondTenant.tag,
    resource_id: secondTenant.chapter
  });

  return data;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cross-tenant boundaries", () => {
  it("keeps explicit resource checks and id lists inside the requested tenant", async () => {
    const data = buildMultiTenantData();

    await expect(
      getAccessibleResourceIds({
        userId: demoIds.student,
        resourceType: "solution_material",
        permission: "view",
        organizationId: demoIds.organization,
        now
      }, data)
    ).resolves.toEqual([demoIds.material]);

    await expect(
      getAccessibleResourceIds({
        userId: secondTenant.student,
        resourceType: "solution_material",
        permission: "view",
        organizationId: secondTenant.organization,
        now
      }, data)
    ).resolves.toEqual([secondTenant.material]);

    await expect(
      canAccessResource({
        userId: demoIds.student,
        resourceType: "exam",
        resourceId: secondTenant.exam,
        permission: "view",
        organizationId: demoIds.organization,
        now
      }, data)
    ).resolves.toBe(false);

    await expect(
      canAccessResource({
        userId: secondTenant.student,
        resourceType: "exam",
        resourceId: demoIds.exam,
        permission: "view",
        organizationId: secondTenant.organization,
        now
      }, data)
    ).resolves.toBe(false);
  });

  it("builds content trees and search results for only the active tenant", async () => {
    const data = buildMultiTenantData();

    const firstTree = await getAccessibleContentTree(demoIds.student, data, demoIds.organization);
    const secondTree = await getAccessibleContentTree(secondTenant.student, data, secondTenant.organization);

    expect(firstTree.years.map((year) => year.id)).toEqual([demoIds.year]);
    expect(firstTree.years[0]?.subjects[0]?.chapters[0]?.materials.map((material) => material.id)).toEqual([demoIds.material]);
    expect(secondTree.years.map((year) => year.id)).toEqual([secondTenant.year]);
    expect(secondTree.years[0]?.subjects[0]?.chapters[0]?.materials.map((material) => material.id)).toEqual([secondTenant.material]);

    const firstSearch = await searchAccessibleContent({
      userId: demoIds.student,
      query: "equations",
      data,
      organizationId: demoIds.organization
    });
    const secondSearch = await searchAccessibleContent({
      userId: secondTenant.student,
      query: "equations",
      data,
      organizationId: secondTenant.organization
    });

    expect(firstSearch.map((result) => result.id)).toEqual(expect.arrayContaining([demoIds.chapter, demoIds.exam]));
    expect(firstSearch.map((result) => result.id)).not.toContain(secondTenant.chapter);
    expect(firstSearch.map((result) => result.id)).not.toContain(secondTenant.exam);
    expect(secondSearch.map((result) => result.id)).toEqual(expect.arrayContaining([secondTenant.chapter, secondTenant.exam]));
    expect(secondSearch.map((result) => result.id)).not.toContain(demoIds.chapter);
    expect(secondSearch.map((result) => result.id)).not.toContain(demoIds.exam);
  });

  it("creates material signed URLs only for the requested tenant", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const data = buildMultiTenantData();

    await expect(
      createMaterialSignedUrl({
        userId: secondTenant.student,
        materialId: secondTenant.material,
        permission: "download",
        data,
        organizationId: secondTenant.organization
      })
    ).resolves.toEqual({
      ok: true,
      signedUrl: `/api/demo/materials/${secondTenant.material}?mode=download`,
      expiresIn: 600
    });

    await expect(
      createMaterialSignedUrl({
        userId: secondTenant.student,
        materialId: demoIds.material,
        permission: "download",
        data,
        organizationId: secondTenant.organization
      })
    ).resolves.toEqual({ ok: false, error: "Access denied." });

    await expect(
      createMaterialSignedUrl({
        userId: demoIds.student,
        materialId: secondTenant.material,
        permission: "download",
        data,
        organizationId: demoIds.organization
      })
    ).resolves.toEqual({ ok: false, error: "Access denied." });
  });
});
