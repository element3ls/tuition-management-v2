"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  FileText,
  Gauge,
  KeyRound,
  Tags,
  UserCog,
  Users,
  UserRoundCog,
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleName } from "@/types/domain";

const links = [
  { label: "Dashboard", href: "/admin", icon: Gauge },
  { label: "Admins", href: "/admin/admins", icon: UserCog, superAdminOnly: true },
  { label: "Students", href: "/admin/users", icon: Users },
  { label: "Groups", href: "/admin/groups", icon: UserRoundCog },
  { label: "Access", href: "/admin/access", icon: KeyRound },
  { label: "Content", href: "/admin/content", icon: BookOpen },
  { label: "Recordings", href: "/admin/recordings", icon: Video },
  { label: "Materials", href: "/admin/materials", icon: FileText },
  { label: "Tags", href: "/admin/tags", icon: Tags },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardList }
] as const;

export function AdminNav({ roles }: { roles: RoleName[] }) {
  const pathname = usePathname();
  const canManageAdmins = roles.includes("super_admin");

  return (
    <nav className="flex gap-1 overflow-x-auto md:grid md:overflow-visible">
      {links.map((link) => {
        const { label, href, icon: Icon } = link;
        const superAdminOnly = "superAdminOnly" in link && link.superAdminOnly;
        if (superAdminOnly && !canManageAdmins) return null;
        const active = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
              active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
            )}
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </Link>
        );
      })}
      <div className="mt-3 hidden rounded-md border border-border/70 bg-secondary/20 p-3 text-xs text-muted-foreground md:block">
        <p className="font-medium text-foreground">Operations console</p>
        <p className="mt-1">Manage students, content, and access from one workspace.</p>
      </div>
    </nav>
  );
}
