import Link from "next/link";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import type { Profile, RoleName } from "@/types/domain";

export function AppHeader({ user, roles }: { user: Profile; roles: RoleName[] }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-semibold">
          Tuition Management
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user.full_name}</span>
          <span className="rounded-sm bg-muted px-2 py-1 text-xs">{roles.join(", ")}</span>
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
