import "server-only";

import { cloneDemoData } from "@/lib/demo-data";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { byCreatedDescThenId, bySortOrderThenName } from "@/lib/sorting";
import { defaultOrganizationId } from "@/lib/tenancy/constants";
import { getCurrentOrganizationId } from "@/lib/tenancy/server";
import type { AppData, RoleName, UserRole } from "@/types/domain";

type GetAppDataOptions = {
  organizationId?: string;
};

function scopedDemoData(organizationId: string): AppData {
  const data = cloneDemoData();
  const memberships = data.organizationMemberships.filter(
    (membership) => membership.organization_id === organizationId && membership.status === "active"
  );
  const userIds = new Set(memberships.map((membership) => membership.user_id));

  return {
    ...data,
    organizations: data.organizations.filter((organization) => organization.id === organizationId),
    organizationMemberships: memberships,
    profiles: data.profiles.filter((profile) => userIds.has(profile.id)),
    userRoles: data.userRoles.filter((role) => userIds.has(role.user_id)),
    studentProfiles: data.studentProfiles.filter((profile) => profile.organization_id === organizationId),
    groups: data.groups.filter((group) => group.organization_id === organizationId),
    memberships: data.memberships.filter((membership) => membership.organization_id === organizationId),
    years: data.years.filter((year) => year.organization_id === organizationId),
    subjects: data.subjects.filter((subject) => subject.organization_id === organizationId),
    chapters: data.chapters.filter((chapter) => chapter.organization_id === organizationId),
    questions: data.questions.filter((question) => question.organization_id === organizationId),
    recordings: data.recordings.filter((recording) => recording.organization_id === organizationId),
    solutionMaterials: data.solutionMaterials.filter((material) => material.organization_id === organizationId),
    exams: data.exams.filter((exam) => exam.organization_id === organizationId),
    examChapters: data.examChapters.filter((examChapter) => examChapter.organization_id === organizationId),
    examQuestions: data.examQuestions.filter((question) => question.organization_id === organizationId),
    examAssets: data.examAssets.filter((asset) => asset.organization_id === organizationId),
    examProcessingRuns: data.examProcessingRuns.filter((run) => run.organization_id === organizationId),
    accessGrants: data.accessGrants.filter((grant) => grant.organization_id === organizationId),
    tags: data.tags.filter((tag) => tag.organization_id === organizationId),
    contentTags: data.contentTags.filter((tag) => tag.organization_id === organizationId),
    auditLogs: data.auditLogs.filter((log) => log.organization_id === organizationId),
    activityEvents: data.activityEvents.filter((event) => event.organization_id === organizationId)
  };
}

export async function getAppData(options: GetAppDataOptions = {}): Promise<AppData> {
  const organizationId = options.organizationId ?? (await getCurrentOrganizationId()) ?? defaultOrganizationId;

  if (isDemoMode() || !isSupabaseConfigured()) {
    return scopedDemoData(organizationId);
  }

  const supabase = createAdminClient();
  const [{ data: organizations }, { data: organizationMemberships }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", organizationId),
    supabase.from("organization_memberships").select("*").eq("organization_id", organizationId)
  ]);
  const userIds = (organizationMemberships ?? []).map((membership) => membership.user_id as string);

  const [
    profiles,
    roles,
    studentProfiles,
    groups,
    memberships,
    years,
    subjects,
    chapters,
    questions,
    recordings,
    solutionMaterials,
    exams,
    examChapters,
    examQuestions,
    examAssets,
    examProcessingRuns,
    accessGrants,
    tags,
    contentTags,
    auditLogs,
    activityEvents
  ] = await Promise.all([
    userIds.length > 0 ? supabase.from("profiles").select("*").in("id", userIds) : Promise.resolve({ data: [] }),
    userIds.length > 0 ? supabase.from("user_roles").select("user_id, roles(name)").in("user_id", userIds) : Promise.resolve({ data: [] }),
    supabase.from("student_profiles").select("*").eq("organization_id", organizationId),
    supabase.from("content_groups").select("*").eq("organization_id", organizationId),
    supabase.from("student_group_memberships").select("*").eq("organization_id", organizationId),
    supabase.from("years").select("*").eq("organization_id", organizationId),
    supabase.from("subjects").select("*").eq("organization_id", organizationId),
    supabase.from("chapters").select("*").eq("organization_id", organizationId),
    supabase.from("questions").select("*").eq("organization_id", organizationId),
    supabase.from("recordings").select("*").eq("organization_id", organizationId),
    supabase.from("solution_materials").select("*").eq("organization_id", organizationId),
    supabase.from("exams").select("*").eq("organization_id", organizationId),
    supabase.from("exam_chapters").select("*").eq("organization_id", organizationId),
    supabase.from("exam_questions").select("*").eq("organization_id", organizationId),
    supabase.from("exam_assets").select("*").eq("organization_id", organizationId),
    supabase.from("exam_processing_runs").select("*").eq("organization_id", organizationId),
    supabase.from("access_grants").select("*").eq("organization_id", organizationId),
    supabase.from("tags").select("*").eq("organization_id", organizationId),
    supabase.from("content_tags").select("*").eq("organization_id", organizationId),
    supabase.from("audit_logs").select("*").eq("organization_id", organizationId),
    supabase.from("activity_events").select("*").eq("organization_id", organizationId)
  ]);

  const userRoles: UserRole[] = (roles.data ?? [])
    .map((row) => {
      const roleRecord = row.roles as { name?: RoleName } | { name?: RoleName }[] | null;
      const role = Array.isArray(roleRecord) ? roleRecord[0]?.name : roleRecord?.name;
      return role ? { user_id: row.user_id as string, role } : null;
    })
    .filter((row): row is UserRole => row !== null);

  return {
    organizations: organizations ?? [],
    organizationMemberships: organizationMemberships ?? [],
    profiles: profiles.data ?? [],
    userRoles,
    studentProfiles: studentProfiles.data ?? [],
    groups: groups.data ?? [],
    memberships: memberships.data ?? [],
    years: (years.data ?? []).sort(bySortOrderThenName),
    subjects: (subjects.data ?? []).sort(bySortOrderThenName),
    chapters: (chapters.data ?? []).sort(bySortOrderThenName),
    questions: (questions.data ?? []).sort(bySortOrderThenName),
    recordings: (recordings.data ?? []).sort(bySortOrderThenName),
    solutionMaterials: (solutionMaterials.data ?? []).sort(bySortOrderThenName),
    exams: (exams.data ?? []).sort(byCreatedDescThenId),
    examChapters: examChapters.data ?? [],
    examQuestions: (examQuestions.data ?? []).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)),
    examAssets: (examAssets.data ?? []).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)),
    examProcessingRuns: (examProcessingRuns.data ?? []).sort(byCreatedDescThenId),
    accessGrants: accessGrants.data ?? [],
    tags: tags.data ?? [],
    contentTags: contentTags.data ?? [],
    auditLogs: (auditLogs.data ?? []).sort(byCreatedDescThenId),
    activityEvents: (activityEvents.data ?? []).sort(byCreatedDescThenId)
  };
}
