import { AppHeader } from "@/components/layout/app-header";
import { AdminNav } from "@/components/layout/admin-nav";
import type { Profile, RoleName } from "@/types/domain";

export function AdminLayout({ children, user, roles }: { children: React.ReactNode; user: Profile; roles: RoleName[] }) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roles={roles} />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[240px_1fr] md:gap-6 md:py-6">
        <aside className="h-fit rounded-lg border border-border/70 bg-card/90 p-3 shadow-sm md:sticky md:top-4">
          <AdminNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
