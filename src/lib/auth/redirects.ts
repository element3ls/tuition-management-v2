import { hasAdminRole } from "@/lib/auth/roles";
import type { Profile, RoleName } from "@/types/domain";

export function getAuthenticatedHomePath(user: Pick<Profile, "must_change_password">, roles: RoleName[]) {
  if (user.must_change_password) {
    return "/account?passwordChange=required";
  }

  return hasAdminRole(roles) ? "/admin" : "/dashboard";
}
