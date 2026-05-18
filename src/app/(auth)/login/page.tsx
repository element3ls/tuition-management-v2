import Link from "next/link";
import { loginAction } from "@/features/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4" data-mutation-form>
            {params.error ? <Alert className="border-destructive text-destructive">{params.error}</Alert> : null}
            {params.success ? <Alert>{params.success}</Alert> : null}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input id="email" name="email" type="email" placeholder="student@example.com" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input id="password" name="password" type="password" placeholder="password" required />
            </div>
            <Button className="w-full" type="submit">
              Log in
            </Button>
            <p className="text-sm text-muted-foreground">
              Demo users: `student@example.com` or `admin@example.com` with any non-empty password.
            </p>
            <Link className="text-sm text-primary hover:underline" href="/forgot-password">
              Forgot password?
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
