import { AppHeader } from "@/components/layout/app-header";
import { AdminNav } from "@/components/layout/admin-nav";
import type { Profile, RoleName } from "@/types/domain";

export function AdminLayout({
  children,
  user,
  roles,
}: {
  children: React.ReactNode;
  user: Profile;
  roles: RoleName[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roles={roles} />
      <div className="mx-auto grid max-w-screen-xl grid-cols-1 gap-5 px-4 py-5 md:grid-cols-[220px_1fr]">
        {/* Sidebar — sticky, no outer border (nav items carry their own highlight) */}
        <aside className="h-fit md:sticky md:top-[calc(3.5rem+20px)]">
          <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
            <AdminNav roles={roles} />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
