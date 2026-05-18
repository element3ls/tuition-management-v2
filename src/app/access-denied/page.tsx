import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4">
      <Alert className="space-y-4">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">Your account does not have permission to open this page.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted" href="/dashboard">
            Student dashboard
          </Link>
          <Link className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted" href="/admin">
            Admin dashboard
          </Link>
          <Link className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted" href="/login">
            Go to login
          </Link>
          <form action={logoutAction} data-mutation-form>
            <Button className="w-full" type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      </Alert>
    </main>
  );
}
