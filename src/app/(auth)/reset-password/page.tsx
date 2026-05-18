import { resetPasswordAction } from "@/features/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={resetPasswordAction} className="space-y-4" data-mutation-form>
            {params.error ? <Alert className="border-destructive text-destructive">{params.error}</Alert> : null}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                New password
              </label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirm password
              </label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
            <Button className="w-full" type="submit">
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
