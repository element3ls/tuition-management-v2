import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cloneDemoData } from "@/lib/demo-data";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  activeOrganizationCookie,
  defaultOrganizationId,
  defaultOrganizationSlug,
  organizationSlugHeader,
  tenantPath
} from "@/lib/tenancy/constants";
import type { Organization, OrganizationMembership, TenantRoleName } from "@/types/domain";

export const tenantAdminRoles: TenantRoleName[] = ["owner", "admin", "teacher"];

function activeMembership(membership: OrganizationMembership) {
  return membership.status === "active";
}

export async function getRequestOrganizationSlug() {
  try {
    const headerStore = await headers();
    const headerSlug = headerStore.get(organizationSlugHeader);
    if (headerSlug) return headerSlug;
  } catch {
    // Unit tests and non-request contexts fall back to the legacy organization.
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get(activeOrganizationCookie)?.value ?? defaultOrganizationSlug;
  } catch {
    return defaultOrganizationSlug;
  }
}

export async function getOrganizationBySlug(slug = defaultOrganizationSlug): Promise<Organization | null> {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return cloneDemoData().organizations.find((organization) => organization.slug === slug) ?? null;
  }

  const supabase = createAdminClient();
  const { data } = await supabase.from("organizations").select("*").eq("slug", slug).maybeSingle();
  return data ?? null;
}

export async function getCurrentOrganization() {
  const slug = await getRequestOrganizationSlug();
  return (await getOrganizationBySlug(slug)) ?? (await getOrganizationBySlug(defaultOrganizationSlug));
}

export async function getCurrentOrganizationId() {
  return (await getCurrentOrganization())?.id ?? defaultOrganizationId;
}

export async function getUserOrganizationMemberships(userId: string): Promise<OrganizationMembership[]> {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return cloneDemoData()
      .organizationMemberships.filter((membership) => membership.user_id === userId)
      .filter(activeMembership);
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organization_memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getDefaultOrganizationForUser(userId: string) {
  const memberships = await getUserOrganizationMemberships(userId);
  const organizationId = memberships[0]?.organization_id ?? defaultOrganizationId;

  if (isDemoMode() || !isSupabaseConfigured()) {
    return cloneDemoData().organizations.find((organization) => organization.id === organizationId) ?? null;
  }

  const supabase = createAdminClient();
  const { data } = await supabase.from("organizations").select("*").eq("id", organizationId).maybeSingle();
  return data ?? null;
}

export async function requireOrganizationAccess(
  orgSlug: string,
  userId: string,
  allowedRoles?: TenantRoleName[]
) {
  const organization = await getOrganizationBySlug(orgSlug);
  if (!organization || organization.status !== "active") {
    redirect("/access-denied");
  }

  const memberships = await getUserOrganizationMemberships(userId);
  const membership = memberships.find((candidate) => candidate.organization_id === organization.id);
  if (!membership || (allowedRoles && !allowedRoles.includes(membership.role))) {
    redirect("/access-denied");
  }

  return { organization, membership };
}

export async function getTenantHomePath(userId: string, adminCapable: boolean) {
  const organization = await getDefaultOrganizationForUser(userId);
  const slug = organization?.slug ?? defaultOrganizationSlug;
  return tenantPath(slug, adminCapable ? "/admin" : "/dashboard");
}
