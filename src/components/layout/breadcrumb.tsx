import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Breadcrumb navigation. The last item is the current page (no link).
 * Rendered above <PageHeading> on every non-root page.
 *
 * Usage:
 *   <Breadcrumb items={[
 *     { label: "Admin", href: "/admin" },
 *     { label: "Exams", href: "/admin/exams" },
 *     { label: exam.title },
 *   ]} />
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-0.5 text-xs">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && (
              <IconChevronRight
                className="size-3 shrink-0 text-muted-foreground/50"
                aria-hidden="true"
              />
            )}
            {isLast ? (
              <span className="text-muted-foreground" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href!}
                className="font-medium text-primary hover:underline"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
