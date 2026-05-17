import { PageHeading } from "@/components/layout/page-heading";
import { addStudentToGroupAction, createGroupAction, removeStudentFromGroupAction, toggleGroupAction } from "@/features/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppData } from "@/server/data/app-data";

export default async function GroupsPage() {
  const data = await getAppData();

  return (
    <>
      <PageHeading title="Groups" description="Manage access groups and memberships." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Create group</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createGroupAction} className="grid gap-3">
              <Input name="name" placeholder="Group name" required />
              <Input name="description" placeholder="Description" />
              <Button type="submit">Create group</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add student</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addStudentToGroupAction} className="grid gap-3">
              <Select name="student_id" required>
                {data.studentProfiles.map((student) => {
                  const profile = data.profiles.find((item) => item.id === student.user_id);
                  return (
                    <option key={student.user_id} value={student.user_id}>
                      {profile?.full_name ?? student.user_id}
                    </option>
                  );
                })}
              </Select>
              <Select name="group_id" required>
                {data.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
              <Button type="submit">Add to group</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Content groups</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.description}</TableCell>
                  <TableCell>{data.memberships.filter((membership) => membership.group_id === group.id).length}</TableCell>
                  <TableCell>
                    <Badge>{group.is_active ? "active" : "inactive"}</Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <form action={toggleGroupAction}>
                      <input name="group_id" type="hidden" value={group.id} />
                      <input name="is_active" type="hidden" value={String(!group.is_active)} />
                      <Button type="submit" variant="outline">
                        {group.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                    {data.memberships
                      .filter((membership) => membership.group_id === group.id)
                      .map((membership) => (
                        <form key={membership.id} action={removeStudentFromGroupAction}>
                          <input name="group_id" type="hidden" value={group.id} />
                          <input name="student_id" type="hidden" value={membership.student_id} />
                          <Button type="submit" variant="ghost">
                            Remove student
                          </Button>
                        </form>
                      ))}
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
