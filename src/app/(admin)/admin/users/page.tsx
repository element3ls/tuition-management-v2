import { PageHeading } from "@/components/layout/page-heading";
import { createStudentAction, deactivateStudentAction } from "@/features/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppData } from "@/server/data/app-data";

export default async function UsersPage() {
  const data = await getAppData();
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
      <PageHeading title="Students" description="Create, edit, deactivate, and group students." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create student</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStudentAction} className="grid gap-3">
            <Input name="full_name" placeholder="Full name" required />
            <Input name="email" placeholder="Email" type="email" required />
            <Input name="password" placeholder="Temporary password" type="password" minLength={8} required />
            <Input name="guardian_name" placeholder="Guardian name" />
            <Input name="phone" placeholder="Phone" />
            <Button type="submit">Create student</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Student records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.user_id}>
                  <TableCell>{student.profile?.full_name ?? "Unknown"}</TableCell>
                  <TableCell>{student.profile?.email}</TableCell>
                  <TableCell>{student.groups.join(", ") || "None"}</TableCell>
                  <TableCell>
                    <Badge>{student.profile?.is_active ? "active" : "inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    {student.profile?.is_active ? (
                      <form action={deactivateStudentAction}>
                        <input name="user_id" type="hidden" value={student.user_id} />
                        <Button type="submit" variant="outline">
                          Deactivate
                        </Button>
                      </form>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
