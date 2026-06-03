import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cloneDemoData } from "@/lib/demo-data";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminRoles, hasAnyRole } from "@/lib/auth/roles";
import { getAuthenticatedHomePath } from "@/lib/auth/redirects";
import type { Profile, RoleName } from "@/types/domain";

export const demoUserCookie = "demo_user_id";

export async function getCurrentUser(): Promise<Profile | null> {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    const userId = cookieStore.get(demoUserCookie)?.value;
    return cloneDemoData().profiles.find((profile) => profile.id === userId && profile.is_active) ?? null;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();

  return (
    profile ?? {
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? user.email ?? "User",
      is_active: true,
      must_change_password: false,
      created_at: user.created_at,
      updated_at: user.updated_at ?? user.created_at
    }
  );
}

export async function getCurrentUserRoles(): Promise<RoleName[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  if (isDemoMode()) {
    return cloneDemoData()
      .userRoles.filter((role) => role.user_id === user.id)
      .map((role) => role.role)
      .sort();
  }

  const supabase = createAdminClient();
  const { data } = await supabase.from("user_roles").select("roles(name)").eq("user_id", user.id);

  return (data ?? [])
    .map((row) => {
      const roleRecord = row.roles as { name?: RoleName } | { name?: RoleName }[] | null;
      return Array.isArray(roleRecord) ? roleRecord[0]?.name : roleRecord?.name;
    })
    .filter((role): role is RoleName => Boolean(role))
    .sort();
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: RoleName[]) {
  const user = await requireAuth();
  const userRoles = await getCurrentUserRoles();

  if (!hasAnyRole(userRoles, roles)) {
    redirect("/access-denied");
  }

  return { user, roles: userRoles };
}

export async function requireAdminAccess() {
  return requireRole(adminRoles);
}

export async function requireSuperAdminAccess() {
  return requireRole(["super_admin"]);
}

export async function requireAdminOrSuperAdminAccess() {
  return requireRole(["admin", "super_admin"]);
}

export async function requireStudentAccess() {
  const result = await requireRole(["student"]);
  if (result.user.must_change_password) {
    redirect("/account?passwordChange=required");
  }
  return result;
}

export async function getLoginRedirect() {
  const user = await getCurrentUser();
  if (!user) return "/login";
  const roles = await getCurrentUserRoles();
  return getAuthenticatedHomePath(user, roles);
}
