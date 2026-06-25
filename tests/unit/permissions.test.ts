import { describe, expect, it } from "vitest";
import { cloneDemoData, demoIds } from "@/lib/demo-data";
import { canAccessAdmin, canAccessResource, getAccessibleContentTree, getAccessibleResourceIds } from "@/lib/permissions";

const now = new Date("2026-05-17T00:00:00.000Z");

describe("permission resolver", () => {
  it("denies student with no grants", async () => {
    const data = cloneDemoData();
    data.memberships = [];
    data.accessGrants = [];

    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "chapter", resourceId: demoIds.chapter, permission: "view", now }, data)
    ).resolves.toBe(false);
  });

  it("allows group year grant to access child content", async () => {
    const data = cloneDemoData();

    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "question", resourceId: demoIds.question, permission: "view", now }, data)
    ).resolves.toBe(true);
  });

  it("allows group subject grant to access child chapters", async () => {
    const data = cloneDemoData();
    data.accessGrants[0] = {
      ...data.accessGrants[0],
      resource_type: "subject",
      resource_id: demoIds.subject,
      permission: "view"
    };

    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "chapter", resourceId: demoIds.chapter, permission: "view", now }, data)
    ).resolves.toBe(true);
  });

  it("allows year and subject grants to access exams", async () => {
    const yearData = cloneDemoData();
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "exam", resourceId: demoIds.exam, permission: "view", now }, yearData)
    ).resolves.toBe(true);

    const subjectData = cloneDemoData();
    subjectData.accessGrants[0] = {
      ...subjectData.accessGrants[0],
      resource_type: "subject",
      resource_id: demoIds.subject,
      permission: "view"
    };
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "exam", resourceId: demoIds.exam, permission: "view", now }, subjectData)
    ).resolves.toBe(true);
  });

  it("allows a direct exam grant without granting the whole subject", async () => {
    const data = cloneDemoData();
    data.accessGrants = [
      {
        ...data.accessGrants[0],
        grantee_type: "user",
        grantee_id: demoIds.student,
        resource_type: "exam",
        resource_id: demoIds.exam,
        permission: "view"
      }
    ];

    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "exam", resourceId: demoIds.exam, permission: "view", now }, data)
    ).resolves.toBe(true);
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "subject", resourceId: demoIds.subject, permission: "view", now }, data)
    ).resolves.toBe(false);
  });

  it("allows direct chapter grant to access that chapter", async () => {
    const data = cloneDemoData();
    data.accessGrants = [
      {
        ...data.accessGrants[0],
        grantee_type: "user",
        grantee_id: demoIds.student,
        resource_type: "chapter",
        resource_id: demoIds.chapter,
        permission: "view"
      }
    ];

    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "chapter", resourceId: demoIds.chapter, permission: "view", now }, data)
    ).resolves.toBe(true);
  });

  it("allows direct recording grant to access that recording", async () => {
    const data = cloneDemoData();
    data.accessGrants = [
      {
        ...data.accessGrants[0],
        grantee_type: "user",
        grantee_id: demoIds.student,
        resource_type: "recording",
        resource_id: demoIds.recording,
        permission: "view"
      }
    ];

    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "recording", resourceId: demoIds.recording, permission: "view", now }, data)
    ).resolves.toBe(true);
  });

  it("denies expired, future, and revoked grants", async () => {
    const expired = cloneDemoData();
    expired.accessGrants[0].expires_at = "2026-05-16T00:00:00.000Z";
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "year", resourceId: demoIds.year, permission: "view", now }, expired)
    ).resolves.toBe(false);

    const future = cloneDemoData();
    future.accessGrants[0].starts_at = "2026-05-18T00:00:00.000Z";
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "year", resourceId: demoIds.year, permission: "view", now }, future)
    ).resolves.toBe(false);

    const revoked = cloneDemoData();
    revoked.accessGrants[0].revoked_at = "2026-05-16T00:00:00.000Z";
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "year", resourceId: demoIds.year, permission: "view", now }, revoked)
    ).resolves.toBe(false);
  });

  it("denies draft and archived content", async () => {
    const draft = cloneDemoData();
    draft.chapters[0].status = "draft";
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "chapter", resourceId: demoIds.chapter, permission: "view", now }, draft)
    ).resolves.toBe(false);

    const archived = cloneDemoData();
    archived.recordings[0].status = "archived";
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "recording", resourceId: demoIds.recording, permission: "view", now }, archived)
    ).resolves.toBe(false);

    const draftExam = cloneDemoData();
    draftExam.exams[0].status = "review";
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "exam", resourceId: demoIds.exam, permission: "view", now }, draftExam)
    ).resolves.toBe(false);

    const archivedExam = cloneDemoData();
    archivedExam.exams[0].status = "archived";
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "exam", resourceId: demoIds.exam, permission: "view", now }, archivedExam)
    ).resolves.toBe(false);
  });

  it("requires download permission for downloads while download implies view", async () => {
    const data = cloneDemoData();
    data.accessGrants[0].permission = "view";

    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "solution_material", resourceId: demoIds.material, permission: "view", now }, data)
    ).resolves.toBe(true);
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "solution_material", resourceId: demoIds.material, permission: "download", now }, data)
    ).resolves.toBe(false);

    data.accessGrants[0].permission = "download";
    await expect(
      canAccessResource({ userId: demoIds.student, resourceType: "solution_material", resourceId: demoIds.material, permission: "view", now }, data)
    ).resolves.toBe(true);
  });

  it("distinguishes student and admin CMS access", () => {
    const data = cloneDemoData();
    expect(canAccessAdmin(demoIds.student, data)).toBe(false);
    expect(canAccessAdmin(demoIds.admin, data)).toBe(true);
  });

  it("honors tenant admin memberships", () => {
    const data = cloneDemoData();
    const secondOrgId = "01000000-0000-4000-8000-000000000099";
    data.organizations.push({
      id: secondOrgId,
      name: "Second Tuition Center",
      slug: "second-tuition-center",
      status: "active",
      metadata: {},
      created_at: "2026-05-17T00:00:00.000Z",
      updated_at: "2026-05-17T00:00:00.000Z"
    });
    data.organizationMemberships.push({
      organization_id: secondOrgId,
      user_id: demoIds.otherStudent,
      role: "teacher",
      status: "active",
      created_at: "2026-05-17T00:00:00.000Z",
      updated_at: "2026-05-17T00:00:00.000Z"
    });

    expect(canAccessAdmin(demoIds.otherStudent, data, demoIds.organization)).toBe(false);
    expect(canAccessAdmin(demoIds.otherStudent, data, secondOrgId)).toBe(true);
  });

  it("denies cross-tenant resource access even with a valid user grant", async () => {
    const data = cloneDemoData();
    const secondOrgId = "01000000-0000-4000-8000-000000000099";
    data.organizations.push({
      id: secondOrgId,
      name: "Second Tuition Center",
      slug: "second-tuition-center",
      status: "active",
      metadata: {},
      created_at: "2026-05-17T00:00:00.000Z",
      updated_at: "2026-05-17T00:00:00.000Z"
    });
    data.organizationMemberships.push({
      organization_id: secondOrgId,
      user_id: demoIds.student,
      role: "student",
      status: "active",
      created_at: "2026-05-17T00:00:00.000Z",
      updated_at: "2026-05-17T00:00:00.000Z"
    });

    await expect(
      canAccessResource({
        userId: demoIds.student,
        resourceType: "year",
        resourceId: demoIds.year,
        permission: "view",
        organizationId: secondOrgId,
        now
      }, data)
    ).resolves.toBe(false);
  });

  it("returns deterministic accessible ids and tree", async () => {
    const data = cloneDemoData();
    await expect(getAccessibleResourceIds({ userId: demoIds.student, resourceType: "recording", permission: "view", now }, data)).resolves.toEqual([
      demoIds.recording
    ]);
    await expect(getAccessibleContentTree(demoIds.student, data)).resolves.toMatchSnapshot();
  });
});
