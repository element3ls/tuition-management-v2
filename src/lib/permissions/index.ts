import { cloneDemoData } from "@/lib/demo-data";
import { bySortOrderThenName } from "@/lib/sorting";
import type {
  AccessGrant,
  AppData,
  Chapter,
  Exam,
  PermissionLevel,
  Question,
  Recording,
  ResourceType,
  RoleName,
  SolutionMaterial,
  Subject,
  Year
} from "@/types/domain";
import { adminRoles, hasAnyRole } from "@/lib/auth/roles";

type ResourceRecord = Year | Subject | Chapter | Question | Recording | SolutionMaterial | Exam;

type ResourceRef = {
  resourceType: ResourceType;
  resourceId: string;
};

type CanAccessParams = {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  permission: PermissionLevel;
  organizationId?: string;
  now?: Date;
};

type AccessibleIdsParams = {
  userId: string;
  resourceType: ResourceType;
  permission: PermissionLevel;
  organizationId?: string;
  now?: Date;
};

function getData(data?: AppData) {
  return data ?? cloneDemoData();
}

function getUserRoles(userId: string, data: AppData): RoleName[] {
  return data.userRoles
    .filter((role) => role.user_id === userId)
    .map((role) => role.role)
    .sort();
}

function activeOrganizationRole(userId: string, organizationId: string, data: AppData) {
  return data.organizationMemberships.find(
    (membership) =>
      membership.user_id === userId &&
      membership.organization_id === organizationId &&
      membership.status === "active"
  )?.role;
}

export function canAccessAdmin(userId: string, data?: AppData, organizationId?: string) {
  const resolvedData = getData(data);
  if (organizationId) {
    const role = activeOrganizationRole(userId, organizationId, resolvedData);
    if (role === "owner" || role === "admin" || role === "teacher") return true;
  }

  return hasAnyRole(getUserRoles(userId, resolvedData), adminRoles);
}

function getResource(data: AppData, resourceType: ResourceType, resourceId: string): ResourceRecord | null {
  switch (resourceType) {
    case "year":
      return data.years.find((item) => item.id === resourceId) ?? null;
    case "subject":
      return data.subjects.find((item) => item.id === resourceId) ?? null;
    case "chapter":
      return data.chapters.find((item) => item.id === resourceId) ?? null;
    case "question":
      return data.questions.find((item) => item.id === resourceId) ?? null;
    case "recording":
      return data.recordings.find((item) => item.id === resourceId) ?? null;
    case "solution_material":
      return data.solutionMaterials.find((item) => item.id === resourceId) ?? null;
    case "exam":
      return data.exams.find((item) => item.id === resourceId) ?? null;
  }
}

function getResourceList(data: AppData, resourceType: ResourceType): ResourceRecord[] {
  switch (resourceType) {
    case "year":
      return data.years;
    case "subject":
      return data.subjects;
    case "chapter":
      return data.chapters;
    case "question":
      return data.questions;
    case "recording":
      return data.recordings;
    case "solution_material":
      return data.solutionMaterials;
    case "exam":
      return data.exams;
  }
}

function isPublished(record: ResourceRecord | null) {
  return record?.status === "published";
}

function organizationMatches(record: { organization_id?: string } | null, organizationId?: string) {
  return !organizationId || record?.organization_id === organizationId;
}

function parentRefs(data: AppData, resourceType: ResourceType, resourceId: string): ResourceRef[] {
  const resource = getResource(data, resourceType, resourceId);
  if (!resource) return [];

  if (resourceType === "year") return [];

  if (resourceType === "subject") {
    const subject = resource as Subject;
    return [{ resourceType: "year", resourceId: subject.year_id }];
  }

  if (resourceType === "chapter") {
    const chapter = resource as Chapter;
    const subject = data.subjects.find((item) => item.id === chapter.subject_id);
    return [
      { resourceType: "subject", resourceId: chapter.subject_id },
      ...(subject ? [{ resourceType: "year" as const, resourceId: subject.year_id }] : [])
    ];
  }

  if (resourceType === "question") {
    const question = resource as Question;
    const chapter = data.chapters.find((item) => item.id === question.chapter_id);
    const subject = chapter ? data.subjects.find((item) => item.id === chapter.subject_id) : null;
    return [
      { resourceType: "chapter", resourceId: question.chapter_id },
      ...(chapter ? [{ resourceType: "subject" as const, resourceId: chapter.subject_id }] : []),
      ...(subject ? [{ resourceType: "year" as const, resourceId: subject.year_id }] : [])
    ];
  }

  if (resourceType === "exam") {
    const exam = resource as Exam;
    const subject = data.subjects.find((item) => item.id === exam.subject_id);
    return [
      { resourceType: "subject", resourceId: exam.subject_id },
      ...(subject ? [{ resourceType: "year" as const, resourceId: subject.year_id }] : [])
    ];
  }

  const leaf = resource as Recording | SolutionMaterial;
  const chapter = data.chapters.find((item) => item.id === leaf.chapter_id);
  const subject = chapter ? data.subjects.find((item) => item.id === chapter.subject_id) : null;
  const refs: ResourceRef[] = [];

  if (leaf.question_id) {
    refs.push({ resourceType: "question", resourceId: leaf.question_id });
  }

  refs.push({ resourceType: "chapter", resourceId: leaf.chapter_id });

  if (chapter) refs.push({ resourceType: "subject", resourceId: chapter.subject_id });
  if (subject) refs.push({ resourceType: "year", resourceId: subject.year_id });

  return refs;
}

function resourceAndAncestors(data: AppData, resourceType: ResourceType, resourceId: string): ResourceRef[] {
  return [{ resourceType, resourceId }, ...parentRefs(data, resourceType, resourceId)];
}

function isPublishedWithAncestors(data: AppData, resourceType: ResourceType, resourceId: string) {
  return resourceAndAncestors(data, resourceType, resourceId).every((ref) =>
    isPublished(getResource(data, ref.resourceType, ref.resourceId))
  );
}

function isActiveWindow(startsAt: string | null, expiresAt: string | null, now: Date) {
  const nowTime = now.getTime();
  if (startsAt && new Date(startsAt).getTime() > nowTime) return false;
  if (expiresAt && new Date(expiresAt).getTime() <= nowTime) return false;
  return true;
}

function activeGroupIdsForUser(userId: string, data: AppData, now: Date, organizationId?: string) {
  return data.memberships
    .filter((membership) => organizationMatches(membership, organizationId))
    .filter((membership) => membership.student_id === userId)
    .filter((membership) => membership.status === "active")
    .filter((membership) => isActiveWindow(membership.starts_at, membership.expires_at, now))
    .filter((membership) =>
      data.groups.some(
        (group) => group.id === membership.group_id && group.is_active && organizationMatches(group, organizationId)
      )
    )
    .map((membership) => membership.group_id)
    .sort();
}

function grantBelongsToUser(grant: AccessGrant, userId: string, groupIds: string[]) {
  if (grant.grantee_type === "user") return grant.grantee_id === userId;
  return groupIds.includes(grant.grantee_id);
}

function grantPermissionMatches(grant: AccessGrant, permission: PermissionLevel) {
  if (permission === "view") return grant.permission === "view" || grant.permission === "download";
  return grant.permission === "download";
}

function grantTargetsResource(grant: AccessGrant, refs: ResourceRef[]) {
  return refs.some((ref) => ref.resourceType === grant.resource_type && ref.resourceId === grant.resource_id);
}

function activeGrantsForUser(userId: string, data: AppData, now: Date, organizationId?: string) {
  const groupIds = activeGroupIdsForUser(userId, data, now, organizationId);

  return data.accessGrants
    .filter((grant) => organizationMatches(grant, organizationId))
    .filter((grant) => grant.revoked_at === null)
    .filter((grant) => isActiveWindow(grant.starts_at, grant.expires_at, now))
    .filter((grant) => grantBelongsToUser(grant, userId, groupIds));
}

export async function canAccessResource(params: CanAccessParams, data?: AppData): Promise<boolean> {
  const resolvedData = getData(data);
  const now = params.now ?? new Date();
  const organizationId = params.organizationId;

  if (!resolvedData.profiles.some((profile) => profile.id === params.userId && profile.is_active)) {
    return false;
  }

  if (organizationId && !activeOrganizationRole(params.userId, organizationId, resolvedData)) {
    return false;
  }

  if (!organizationMatches(getResource(resolvedData, params.resourceType, params.resourceId), organizationId)) {
    return false;
  }

  if (!isPublishedWithAncestors(resolvedData, params.resourceType, params.resourceId)) {
    return false;
  }

  const refs = resourceAndAncestors(resolvedData, params.resourceType, params.resourceId);

  return activeGrantsForUser(params.userId, resolvedData, now, organizationId).some(
    (grant) => grantPermissionMatches(grant, params.permission) && grantTargetsResource(grant, refs)
  );
}

export async function getAccessibleResourceIds(params: AccessibleIdsParams, data?: AppData): Promise<string[]> {
  const resolvedData = getData(data);
  const resources = getResourceList(resolvedData, params.resourceType);
  const ids: string[] = [];

  for (const resource of resources) {
    if (
      await canAccessResource(
        {
          userId: params.userId,
          resourceType: params.resourceType,
          resourceId: resource.id,
          permission: params.permission,
          organizationId: params.organizationId,
          now: params.now
        },
        resolvedData
      )
    ) {
      ids.push(resource.id);
    }
  }

  return ids.sort();
}

export async function getAccessibleContentTree(userId: string, data?: AppData, organizationId?: string) {
  const resolvedData = getData(data);
  const resolvedOrganizationId = organizationId ?? resolvedData.organizations[0]?.id;
  const accessibleSubjects = new Set(
    await getAccessibleResourceIds({ userId, resourceType: "subject", permission: "view", organizationId: resolvedOrganizationId }, resolvedData)
  );
  const accessibleChapters = new Set(
    await getAccessibleResourceIds({ userId, resourceType: "chapter", permission: "view", organizationId: resolvedOrganizationId }, resolvedData)
  );
  const accessibleQuestions = new Set(
    await getAccessibleResourceIds({ userId, resourceType: "question", permission: "view", organizationId: resolvedOrganizationId }, resolvedData)
  );
  const accessibleRecordings = new Set(
    await getAccessibleResourceIds({ userId, resourceType: "recording", permission: "view", organizationId: resolvedOrganizationId }, resolvedData)
  );
  const accessibleMaterials = new Set(
    await getAccessibleResourceIds({
      userId,
      resourceType: "solution_material",
      permission: "view",
      organizationId: resolvedOrganizationId
    }, resolvedData)
  );

  const years = resolvedData.years
    .filter((year) => organizationMatches(year, resolvedOrganizationId))
    .filter((year) => year.status === "published")
    .map((year) => ({
      ...year,
      subjects: resolvedData.subjects
        .filter((subject) => subject.year_id === year.id && subject.status === "published")
        .filter((subject) => accessibleSubjects.has(subject.id))
        .sort(bySortOrderThenName)
        .map((subject) => ({
          ...subject,
          chapters: resolvedData.chapters
            .filter((chapter) => chapter.subject_id === subject.id && chapter.status === "published")
            .filter((chapter) => accessibleChapters.has(chapter.id))
            .sort(bySortOrderThenName)
            .map((chapter) => ({
              ...chapter,
              questions: resolvedData.questions
                .filter((question) => question.chapter_id === chapter.id && question.status === "published")
                .filter((question) => accessibleQuestions.has(question.id))
                .sort(bySortOrderThenName),
              recordings: resolvedData.recordings
                .filter((recording) => recording.chapter_id === chapter.id && recording.status === "published")
                .filter((recording) => accessibleRecordings.has(recording.id))
                .sort(bySortOrderThenName),
              materials: resolvedData.solutionMaterials
                .filter((material) => material.chapter_id === chapter.id && material.status === "published")
                .filter((material) => accessibleMaterials.has(material.id))
                .sort(bySortOrderThenName)
            }))
        }))
    }))
    .filter((year) => year.subjects.length > 0)
    .sort(bySortOrderThenName);

  return { years };
}
