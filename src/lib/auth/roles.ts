import type { RoleName } from "@/types/domain";

export const adminRoles: RoleName[] = ["teacher", "admin", "super_admin"];

export function hasAnyRole(userRoles: RoleName[], allowedRoles: RoleName[]) {
  return userRoles.some((role) => allowedRoles.includes(role));
}

export function hasAdminRole(userRoles: RoleName[]) {
  return hasAnyRole(userRoles, adminRoles);
}
