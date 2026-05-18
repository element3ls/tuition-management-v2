import Link from "next/link";
import { forgotPasswordAction } from "@/features/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={forgotPasswordAction} className="space-y-4" data-mutation-form>
            {params.error ? <Alert className="border-destructive text-destructive">{params.error}</Alert> : null}
            {params.success ? <Alert>{params.success}</Alert> : null}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button className="w-full" type="submit">
              Send reset instructions
            </Button>
            <Link className="text-sm text-primary hover:underline" href="/login">
              Back to login
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
