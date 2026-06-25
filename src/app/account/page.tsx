import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/layout/page-heading";
import { updateOwnPasswordAction, updateOwnProfileAction } from "@/features/auth/actions";
import { hasAdminRole } from "@/lib/auth/roles";
import { getCurrentUserRoles, requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string; passwordChange?: string }>;
}) {
  const [user, roles, params] = await Promise.all([requireAuth(), getCurrentUserRoles(), searchParams]);
  const homeHref = hasAdminRole(roles) ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roles={roles} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <PageHeading
          title="Account"
          description="Update your own profile details and password."
          actions={
            user.must_change_password ? null : (
              <Link className="text-sm font-medium text-primary hover:underline" href={homeHref}>
                Back to dashboard
              </Link>
            )
          }
        />
        <div className="grid gap-4">
          {user.must_change_password || params.passwordChange === "required" ? (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950 dark:text-amber-200">
              You must set a new password before accessing student content.
            </Alert>
          ) : null}
          {params.error ? <Alert className="border-destructive text-destructive">{params.error}</Alert> : null}
          {params.success ? <Alert>{params.success}</Alert> : null}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Change the name and email used for your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateOwnProfileAction} className="grid gap-3" data-mutation-form>
                  <Field label="Full name">
                    <Input name="full_name" defaultValue={user.full_name} required />
                  </Field>
                  <Field label="Email">
                    <Input name="email" type="email" defaultValue={user.email} required />
                  </Field>
                  <Button type="submit">Save profile</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Set a new password for your next login.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateOwnPasswordAction} className="grid gap-3" data-mutation-form>
                  <Field label="New password">
                    <Input name="password" type="password" minLength={8} required />
                  </Field>
                  <Field label="Confirm password">
                    <Input name="confirmPassword" type="password" minLength={8} required />
                  </Field>
                  <Button type="submit">Update password</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
