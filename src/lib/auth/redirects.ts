import { hasAdminRole } from "@/lib/auth/roles";
import { tenantPath } from "@/lib/tenancy/constants";
import type { Profile, RoleName } from "@/types/domain";

export function getAuthenticatedHomePath(
  user: Pick<Profile, "must_change_password">,
  roles: RoleName[],
  orgSlug?: string
) {
  if (user.must_change_password) {
    return "/account?passwordChange=required";
  }

  const path = hasAdminRole(roles) ? "/admin" : "/dashboard";
  return orgSlug ? tenantPath(orgSlug, path) : path;
}
