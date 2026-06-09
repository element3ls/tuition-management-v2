import "server-only";

import { cloneDemoData } from "@/lib/demo-data";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { byCreatedDescThenId, bySortOrderThenName } from "@/lib/sorting";
import type { AppData, RoleName, UserRole } from "@/types/domain";

export async function getAppData(): Promise<AppData> {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return cloneDemoData();
  }

  const supabase = createAdminClient();
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
    examQuestions,
    accessGrants,
    tags,
    contentTags,
    auditLogs,
    activityEvents
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("user_roles").select("user_id, roles(name)"),
    supabase.from("student_profiles").select("*"),
    supabase.from("content_groups").select("*"),
    supabase.from("student_group_memberships").select("*"),
    supabase.from("years").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("chapters").select("*"),
    supabase.from("questions").select("*"),
    supabase.from("recordings").select("*"),
    supabase.from("solution_materials").select("*"),
    supabase.from("exams").select("*"),
    supabase.from("exam_questions").select("*"),
    supabase.from("access_grants").select("*"),
    supabase.from("tags").select("*"),
    supabase.from("content_tags").select("*"),
    supabase.from("audit_logs").select("*"),
    supabase.from("activity_events").select("*")
  ]);

  const userRoles: UserRole[] = (roles.data ?? [])
    .map((row) => {
      const roleRecord = row.roles as { name?: RoleName } | { name?: RoleName }[] | null;
      const role = Array.isArray(roleRecord) ? roleRecord[0]?.name : roleRecord?.name;
      return role ? { user_id: row.user_id as string, role } : null;
    })
    .filter((row): row is UserRole => row !== null);

  return {
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
    examQuestions: (examQuestions.data ?? []).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)),
    accessGrants: accessGrants.data ?? [],
    tags: tags.data ?? [],
    contentTags: contentTags.data ?? [],
    auditLogs: (auditLogs.data ?? []).sort(byCreatedDescThenId),
    activityEvents: (activityEvents.data ?? []).sort(byCreatedDescThenId)
  };
}
