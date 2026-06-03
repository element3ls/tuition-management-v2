import { AdminDialog, CheckField, CreateButton, EditButton, EmptyTable, Field, StatusBadge } from "@/components/admin/admin-ui";
import { PageHeading } from "@/components/layout/page-heading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createStudentAction, deactivateStudentAction, updateStudentAction } from "@/features/admin/actions";
import { hasAnyRole } from "@/lib/auth/roles";
import { getCurrentUserRoles } from "@/lib/auth/session";
import { getAppData } from "@/server/data/app-data";
import { StudentImportDialog } from "@/app/(admin)/admin/users/student-import-dialog";

export default async function UsersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [data, roles, params] = await Promise.all([getAppData(), getCurrentUserRoles(), searchParams]);
  const canImportStudents = hasAnyRole(roles, ["admin", "super_admin"]);
  const students = data.studentProfiles.map((student) => ({
    ...student,
    profile: data.profiles.find((profile) => profile.id === student.user_id),
    groups: data.memberships
      .filter((membership) => membership.student_id === student.user_id)
      .map((membership) => data.groups.find((group) => group.id === membership.group_id)?.name)
      .filter(Boolean)
  }));

  return (
    <>
      <PageHeading
        title="Students"
        description="Maintain student profiles, login emails, guardians, and account status."
        actions={
          <>
            {canImportStudents ? <StudentImportDialog /> : null}
            <AdminDialog title="Create student" description="Create login access and the student profile." trigger={<CreateButton>New student</CreateButton>}>
              <form action={createStudentAction} className="grid gap-3" data-mutation-form>
                <Field label="Full name">
                  <Input name="full_name" required />
                </Field>
                <Field label="Email">
                  <Input name="email" type="email" required />
                </Field>
                <Field label="Temporary password">
                  <Input name="password" type="password" minLength={8} required />
                </Field>
                <Field label="Guardian name">
                  <Input name="guardian_name" />
                </Field>
                <Field label="Phone">
                  <Input name="phone" />
                </Field>
                <Field label="Notes">
                  <Textarea name="notes" />
                </Field>
                <Button type="submit">Create student</Button>
              </form>
            </AdminDialog>
          </>
        }
      />
      {params.error ? <Alert variant="destructive" className="mb-4">{params.error}</Alert> : null}
      {params.success ? <Alert className="mb-4">{params.success}</Alert> : null}
      <div className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? <EmptyTable colSpan={5} label="No students yet." /> : null}
            {students.map((student) => (
              <TableRow key={student.user_id}>
                <TableCell>
                  <div className="font-medium">{student.profile?.full_name ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{student.guardian_name ?? "No guardian"}</div>
                </TableCell>
                <TableCell>{student.profile?.email}</TableCell>
                <TableCell>{student.groups.join(", ") || "None"}</TableCell>
                <TableCell>
                  <StatusBadge status={student.profile?.is_active} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <AdminDialog title="Edit student" trigger={<EditButton />}>
                      <form action={updateStudentAction} className="grid gap-3" data-mutation-form>
                        <input name="user_id" type="hidden" value={student.user_id} />
                        <Field label="Full name">
                          <Input name="full_name" defaultValue={student.profile?.full_name ?? ""} required />
                        </Field>
                        <Field label="Email">
                          <Input name="email" type="email" defaultValue={student.profile?.email ?? ""} required />
                        </Field>
                        <Field label="Guardian name">
                          <Input name="guardian_name" defaultValue={student.guardian_name ?? ""} />
                        </Field>
                        <Field label="Phone">
                          <Input name="phone" defaultValue={student.phone ?? ""} />
                        </Field>
                        <Field label="Notes">
                          <Textarea name="notes" defaultValue={student.notes ?? ""} />
                        </Field>
                        <CheckField name="is_active" label="Active account" defaultChecked={student.profile?.is_active ?? false} />
                        <Button type="submit">Save changes</Button>
                      </form>
                    </AdminDialog>
                    {student.profile?.is_active ? (
                      <form action={deactivateStudentAction} data-mutation-form>
                        <input name="user_id" type="hidden" value={student.user_id} />
                        <Button type="submit" variant="outline" size="sm">
                          Deactivate
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
