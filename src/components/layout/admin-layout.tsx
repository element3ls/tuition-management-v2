import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import type { Profile, RoleName } from "@/types/domain";

const links = [
  ["Dashboard", "/admin"],
  ["Students", "/admin/users"],
  ["Groups", "/admin/groups"],
  ["Access", "/admin/access"],
  ["Content", "/admin/content"],
  ["Recordings", "/admin/recordings"],
  ["Materials", "/admin/materials"],
  ["Tags", "/admin/tags"],
  ["Audit Logs", "/admin/audit-logs"]
] as const;

export function AdminLayout({ children, user, roles }: { children: React.ReactNode; user: Profile; roles: RoleName[] }) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roles={roles} />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-md border bg-card p-3">
          <nav className="grid gap-1">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
