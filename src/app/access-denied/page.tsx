import Link from "next/link";
import { Alert } from "@/components/ui/alert";

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4">
      <Alert className="space-y-4">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">Your account does not have permission to open this page.</p>
        <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted" href="/dashboard">
          Back to dashboard
        </Link>
      </Alert>
    </main>
  );
}
