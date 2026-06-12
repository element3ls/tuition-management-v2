import { AdminDialog, CheckField, CreateButton, EditButton, EmptyTable, Field, StatusBadge } from "@/components/admin/admin-ui";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeading } from "@/components/layout/page-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconUserPlus } from "@tabler/icons-react";
import {
  addStudentToGroupAction,
  createGroupAction,
  removeStudentFromGroupAction,
  updateGroupAction,
  updateMembershipAction
} from "@/features/admin/actions";
import { getAppData } from "@/server/data/app-data";

function datetimeInputValue(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

export default async function GroupsPage() {
  const data = await getAppData();

  return (
    <>
      <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Groups" }]} />
      <PageHeading
        title="Groups"
        description="Manage access cohorts, student memberships, and membership windows."
        actions={
          <>
            <AdminDialog
              title="Add student to group"
              trigger={
                <button type="button" className={buttonVariants({ variant: "secondary" })}>
                  <IconUserPlus className="size-4" />
                  Add student
                </button>
              }
            >
              <form action={addStudentToGroupAction} className="grid gap-3" data-mutation-form>
                <Field label="Student">
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
                </Field>
                <Field label="Group">
                  <Select name="group_id" required>
                    {data.groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Starts at">
                  <Input name="starts_at" type="datetime-local" />
                </Field>
                <Field label="Expires at">
                  <Input name="expires_at" type="datetime-local" />
                </Field>
                <Button type="submit">Add to group</Button>
              </form>
            </AdminDialog>
            <AdminDialog title="Create group" trigger={<CreateButton>New group</CreateButton>}>
              <form action={createGroupAction} className="grid gap-3" data-mutation-form>
                <Field label="Group name">
                  <Input name="name" required />
                </Field>
                <Field label="Description">
                  <Input name="description" />
                </Field>
                <Button type="submit">Create group</Button>
              </form>
            </AdminDialog>
          </>
        }
      />
      <div className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[220px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.groups.length === 0 ? <EmptyTable colSpan={5} label="No groups yet." /> : null}
            {data.groups.map((group) => {
              const memberships = data.memberships.filter((membership) => membership.group_id === group.id);
              return (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.description ?? "No description"}</TableCell>
                  <TableCell>
                    <div className="grid gap-1">
                      <span>{memberships.length} students</span>
                      <span className="text-xs text-muted-foreground">
                        {memberships
                          .map((membership) => data.profiles.find((profile) => profile.id === membership.student_id)?.full_name)
                          .filter(Boolean)
                          .join(", ") || "No members"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={group.is_active} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <AdminDialog title="Edit group" trigger={<EditButton />}>
                        <form action={updateGroupAction} className="grid gap-3" data-mutation-form>
                          <input name="group_id" type="hidden" value={group.id} />
                          <Field label="Group name">
                            <Input name="name" defaultValue={group.name} required />
                          </Field>
                          <Field label="Description">
                            <Input name="description" defaultValue={group.description ?? ""} />
                          </Field>
                          <CheckField name="is_active" label="Active group" defaultChecked={group.is_active} />
                          <Button type="submit">Save changes</Button>
                        </form>
                      </AdminDialog>
                      <AdminDialog
                        title="Edit memberships"
                        trigger={<button type="button" className={buttonVariants({ variant: "outline", size: "sm" })}>Members</button>}
                      >
                        <div className="grid gap-3">
                          {memberships.length === 0 ? <p className="text-sm text-muted-foreground">No memberships in this group.</p> : null}
                          {memberships.map((membership) => {
                            const profile = data.profiles.find((item) => item.id === membership.student_id);
                            return (
                              <div key={membership.id} className="rounded-md border border-border/70 p-3">
                                <p className="mb-2 text-sm font-medium">{profile?.full_name ?? membership.student_id}</p>
                                <form action={updateMembershipAction} className="grid gap-2" data-mutation-form>
                                  <input name="membership_id" type="hidden" value={membership.id} />
                                  <Field label="Status">
                                    <Select name="status" defaultValue={membership.status}>
                                      <option value="active">Active</option>
                                      <option value="inactive">Inactive</option>
                                    </Select>
                                  </Field>
                                  <Field label="Starts at">
                                    <Input name="starts_at" type="datetime-local" defaultValue={datetimeInputValue(membership.starts_at)} />
                                  </Field>
                                  <Field label="Expires at">
                                    <Input name="expires_at" type="datetime-local" defaultValue={datetimeInputValue(membership.expires_at)} />
                                  </Field>
                                  <Button type="submit" size="sm">Save</Button>
                                </form>
                                <form action={removeStudentFromGroupAction} className="mt-2" data-mutation-form>
                                  <input name="group_id" type="hidden" value={group.id} />
                                  <input name="student_id" type="hidden" value={membership.student_id} />
                                  <Button type="submit" variant="outline" size="sm">Remove</Button>
                                </form>
                              </div>
                            );
                          })}
                        </div>
                      </AdminDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
