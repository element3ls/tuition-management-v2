"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBooks,
  IconClipboardList,
  IconFileCheck,
  IconFiles,
  IconGauge,
  IconKey,
  IconTags,
  IconUserCog,
  IconUsers,
  IconUsersGroup,
  IconVideo,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { RoleName } from "@/types/domain";

const links = [
  { label: "Dashboard",  href: "/admin",             icon: IconGauge },
  { label: "Admins",     href: "/admin/admins",       icon: IconUserCog,   superAdminOnly: true },
  { label: "Students",   href: "/admin/users",        icon: IconUsers },
  { label: "Groups",     href: "/admin/groups",       icon: IconUsersGroup },
  { label: "Access",     href: "/admin/access",       icon: IconKey },
  { label: "Content",    href: "/admin/content",      icon: IconBooks },
  { label: "Recordings", href: "/admin/recordings",   icon: IconVideo },
  { label: "Materials",  href: "/admin/materials",    icon: IconFiles },
  { label: "Exams",      href: "/admin/exams",        icon: IconFileCheck },
  { label: "Tags",       href: "/admin/tags",         icon: IconTags },
  { label: "Audit logs", href: "/admin/audit-logs",   icon: IconClipboardList },
] as const;

export function AdminNav({ roles }: { roles: RoleName[] }) {
  const pathname = usePathname();
  const canManageAdmins = roles.includes("super_admin");

  return (
    <nav className="flex gap-1 overflow-x-auto md:grid md:overflow-visible">
      {links.map((link) => {
        const { label, href, icon: Icon } = link;
        const superAdminOnly =
          "superAdminOnly" in link && link.superAdminOnly;
        if (superAdminOnly && !canManageAdmins) return null;

        const active =
          pathname === href ||
          (href !== "/admin" && pathname.startsWith(`${href}/`));

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              // Base: 10px radius, 15px icon, sentence-case label
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? // Filled periwinkle highlight — never a left-border bar
                  "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-[15px] shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}

      {/* Contextual hint */}
      <div className="mt-3 hidden rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground md:block">
        <p className="font-medium text-foreground">Operations console</p>
        <p className="mt-1">
          Manage students, content, and access from one workspace.
        </p>
      </div>
    </nav>
  );
}
