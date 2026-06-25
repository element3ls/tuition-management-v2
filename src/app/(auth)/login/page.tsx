import Link from "next/link";
import { loginAction } from "@/features/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TutorEaseMark } from "@/components/layout/app-header";
import { ThemeToggleCorner } from "@/components/layout/theme-toggle";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/60 px-4">
      <ThemeToggleCorner />
      <div className="mb-6 flex flex-col items-center gap-2">
        <TutorEaseMark size={36} />
        <span className="text-base font-semibold tracking-tight text-foreground">TutorEase</span>
      </div>
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle>Log in to your account</CardTitle>
          <CardDescription>Enter your email and password to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
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
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor="remember">
                <input id="remember" name="remember" type="checkbox" className="size-4 rounded border-input" />
                Remember me
              </label>
              <Link className="text-sm text-primary hover:underline" href="/forgot-password">
                Forgot password?
              </Link>
            </div>
            <Button className="w-full" type="submit">
              Log in
            </Button>
            <p className="text-sm text-muted-foreground">
              Demo users: `student@example.com` or `admin@example.com` with any non-empty password.
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
