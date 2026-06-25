export const defaultOrganizationId = "01000000-0000-4000-8000-000000000001";
export const defaultOrganizationSlug = "legacy-tuition-center";
export const organizationSlugHeader = "x-organization-slug";
export const activeOrganizationCookie = "active_org_slug";

export const tenantRoutePrefixes = [
  "/admin",
  "/dashboard",
  "/years",
  "/subjects",
  "/chapters",
  "/questions",
  "/recordings",
  "/materials",
  "/exams",
  "/search"
] as const;

export function tenantPath(orgSlug: string, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/o/${orgSlug}${normalized}`;
}

export function isTenantRoutablePath(pathname: string) {
  return tenantRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
