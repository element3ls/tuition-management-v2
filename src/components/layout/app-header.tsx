import Link from "next/link";
import { logoutAction } from "@/features/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { hasAdminRole } from "@/lib/auth/roles";
import { defaultOrganizationSlug, tenantPath } from "@/lib/tenancy/constants";
import type { Profile, RoleName } from "@/types/domain";

// TutorEase monogram mark — rounded square, deep navy + periwinkle
export function TutorEaseMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#292966" />
      {/* T crossbar */}
      <path d="M12 14.5h16" stroke="#CCCCFF" strokeWidth="3" strokeLinecap="round" />
      {/* T stem */}
      <path d="M20 14.5V28" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      {/* Dot accent */}
      <circle cx="20" cy="28" r="1.9" fill="#CCCCFF" />
    </svg>
  );
}

export function AppHeader({
  user,
  roles,
  orgSlug = defaultOrganizationSlug,
}: {
  user: Profile;
  roles: RoleName[];
  orgSlug?: string;
}) {
  const homeHref = tenantPath(orgSlug, hasAdminRole(roles) ? "/admin" : "/dashboard");
  const isAdmin = hasAdminRole(roles);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 px-4">

        {/* Left — logo + wordmark */}
        <Link
          href={homeHref}
          className="flex shrink-0 items-center gap-2.5 font-semibold"
        >
          <TutorEaseMark size={28} />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            TutorEase
          </span>
          {isAdmin && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Admin
            </span>
          )}
        </Link>

        {/* Right — user name + account + logout */}
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            {user.full_name}
          </span>
          <ThemeToggle />
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href="/account"
          >
            Account
          </Link>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" type="submit">
              Log out
            </Button>
          </form>
        </div>

      </div>
    </header>
  );
}
