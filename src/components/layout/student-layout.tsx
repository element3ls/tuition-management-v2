import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { defaultOrganizationSlug, tenantPath } from "@/lib/tenancy/constants";
import type { Profile, RoleName } from "@/types/domain";

export function StudentLayout({
  children,
  user,
  roles,
  orgSlug = defaultOrganizationSlug,
}: {
  children: React.ReactNode;
  user: Profile;
  roles: RoleName[];
  orgSlug?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roles={roles} orgSlug={orgSlug} />

      {/* Secondary nav — Dashboard · Search */}
      <div className="border-b border-border bg-card">
        <nav className="mx-auto flex max-w-screen-lg items-center gap-1 px-4 py-2">
          <Link
            href={tenantPath(orgSlug, "/dashboard")}
            className="rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href={tenantPath(orgSlug, "/search")}
            className="rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Search
          </Link>
        </nav>
      </div>

      <main className="mx-auto max-w-screen-lg px-4 py-6">{children}</main>
    </div>
  );
}
