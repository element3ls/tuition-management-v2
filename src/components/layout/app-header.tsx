import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { hasAdminRole } from "@/lib/auth/roles";
import type { Profile, RoleName } from "@/types/domain";

export function AppHeader({ user, roles }: { user: Profile; roles: RoleName[] }) {
  const homeHref = hasAdminRole(roles) ? "/admin" : "/dashboard";

  return (
    <header className="border-b border-border/70 bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href={homeHref} className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="rounded-lg bg-primary p-2 text-primary-foreground">
            <GraduationCap className="size-4" />
          </span>
          <span className="min-w-0">Tuition Management</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-sm sm:gap-3">
          <span className="hidden truncate text-muted-foreground sm:inline">{user.full_name}</span>
          <span className="max-w-28 truncate rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground sm:max-w-none">
            {roles.join(", ")}
          </span>
          <Link className={buttonVariants({ variant: "outline" })} href="/account">
            Account
          </Link>
          <form action={logoutAction}>
            <Button variant="outline" type="submit">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
