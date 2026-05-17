import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import type { Profile, RoleName } from "@/types/domain";

export function StudentLayout({ children, user, roles }: { children: React.ReactNode; user: Profile; roles: RoleName[] }) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roles={roles} />
      <div className="border-b bg-card/60">
        <nav className="mx-auto flex max-w-7xl gap-4 px-4 py-3 text-sm">
          <Link className="hover:text-primary" href="/dashboard">
            Dashboard
          </Link>
          <Link className="hover:text-primary" href="/search">
            Search
          </Link>
        </nav>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
