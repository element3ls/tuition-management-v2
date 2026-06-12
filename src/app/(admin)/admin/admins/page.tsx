import { AdminDialog, CreateButton, EmptyTable, Field, StatusBadge } from "@/components/admin/admin-ui";
import { PageHeading } from "@/components/layout/page-heading";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createAdminAction } from "@/features/admin/actions";
import { requireSuperAdminAccess } from "@/lib/auth/session";
import { getAppData } from "@/server/data/app-data";

export default async function AdminUsersPage() {
  await requireSuperAdminAccess();
  const data = await getAppData();
  const adminUserIds = new Set(data.userRoles.filter((role) => role.role === "admin").map((role) => role.user_id));
  const admins = data.profiles
    .filter((profile) => adminUserIds.has(profile.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <>
      <PageHeading
        title="Admins"
        eyebrow="Admins"
        description="Create and review admin console accounts. Super-admin only."
        actions={
          <AdminDialog title="Create admin" description="Create login access for a normal admin account." trigger={<CreateButton>New admin</CreateButton>}>
            <form action={createAdminAction} className="grid gap-3" data-mutation-form>
              <Field label="Full name">
                <Input name="full_name" required />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Temporary password">
                <Input name="password" type="password" minLength={8} required />
              </Field>
              <Button type="submit">Create admin</Button>
            </form>
          </AdminDialog>
        }
      />
      <div className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? <EmptyTable colSpan={4} label="No normal admin users yet." /> : null}
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={admin.full_name} size="sm" />
                    <span className="font-medium">{admin.full_name}</span>
                  </div>
                </TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>
                  <StatusBadge status={admin.is_active} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{new Date(admin.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
