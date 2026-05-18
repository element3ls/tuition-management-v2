import { AdminDialog, CreateButton, EmptyTable, Field, StatusBadge } from "@/components/admin/admin-ui";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createAccessGrantAction, revokeAccessGrantAction } from "@/features/admin/actions";
import { getAppData } from "@/server/data/app-data";

export default async function AccessPage() {
  const data = await getAppData();
  const resourceName = (type: string, id: string) =>
    type === "year"
      ? data.years.find((item) => item.id === id)?.name
      : type === "subject"
        ? data.subjects.find((item) => item.id === id)?.name
        : type === "chapter"
          ? data.chapters.find((item) => item.id === id)?.title
          : type === "question"
            ? data.questions.find((item) => item.id === id)?.title
            : type === "recording"
              ? data.recordings.find((item) => item.id === id)?.title
              : data.solutionMaterials.find((item) => item.id === id)?.title;

  return (
    <>
      <PageHeading
        title="Access grants"
        description="Grant direct or group access to syllabus resources and private materials."
        actions={
          <AdminDialog title="Create access grant" trigger={<CreateButton>New grant</CreateButton>}>
            <form action={createAccessGrantAction} className="grid gap-3" data-mutation-form>
              <Field label="Grantee type">
                <Select name="grantee_type">
                  <option value="group">Group</option>
                  <option value="user">Student</option>
                </Select>
              </Field>
              <Field label="Grantee">
                <Select name="grantee_id">
                  {data.groups.map((group) => <option key={group.id} value={group.id}>Group: {group.name}</option>)}
                  {data.studentProfiles.map((student) => {
                    const profile = data.profiles.find((item) => item.id === student.user_id);
                    return <option key={student.user_id} value={student.user_id}>Student: {profile?.full_name ?? student.user_id}</option>;
                  })}
                </Select>
              </Field>
              <Field label="Resource type">
                <Select name="resource_type">
                  <option value="year">Year</option>
                  <option value="subject">Subject</option>
                  <option value="chapter">Chapter</option>
                  <option value="question">Question</option>
                  <option value="recording">Recording</option>
                  <option value="solution_material">Solution material</option>
                </Select>
              </Field>
              <Field label="Resource">
                <Select name="resource_id">
                  {data.years.map((year) => <option key={year.id} value={year.id}>Year: {year.name}</option>)}
                  {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>Subject: {subject.name}</option>)}
                  {data.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>Chapter: {chapter.title}</option>)}
                  {data.questions.map((question) => <option key={question.id} value={question.id}>Question: {question.title}</option>)}
                  {data.recordings.map((recording) => <option key={recording.id} value={recording.id}>Recording: {recording.title}</option>)}
                  {data.solutionMaterials.map((material) => <option key={material.id} value={material.id}>Material: {material.title}</option>)}
                </Select>
              </Field>
              <Field label="Permission">
                <Select name="permission">
                  <option value="view">View</option>
                  <option value="download">Download</option>
                </Select>
              </Field>
              <Field label="Starts at"><Input name="starts_at" type="datetime-local" /></Field>
              <Field label="Expires at"><Input name="expires_at" type="datetime-local" /></Field>
              <Button type="submit">Create grant</Button>
            </form>
          </AdminDialog>
        }
      />
      <div className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grantee</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[110px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.accessGrants.length === 0 ? <EmptyTable colSpan={6} label="No access grants yet." /> : null}
            {data.accessGrants.map((grant) => (
              <TableRow key={grant.id}>
                <TableCell>{grant.grantee_type === "group" ? data.groups.find((group) => group.id === grant.grantee_id)?.name : data.profiles.find((profile) => profile.id === grant.grantee_id)?.full_name}</TableCell>
                <TableCell><div className="font-medium">{resourceName(grant.resource_type, grant.resource_id) ?? grant.resource_id}</div><div className="text-xs text-muted-foreground">{grant.resource_type}</div></TableCell>
                <TableCell className="capitalize">{grant.permission}</TableCell>
                <TableCell>{grant.starts_at ?? "now"} to {grant.expires_at ?? "no expiry"}</TableCell>
                <TableCell><StatusBadge status={grant.revoked_at ? "revoked" : "active"} /></TableCell>
                <TableCell className="text-right">
                  {!grant.revoked_at ? (
                    <form action={revokeAccessGrantAction} data-mutation-form>
                      <input name="grant_id" type="hidden" value={grant.id} />
                      <Button type="submit" variant="outline" size="sm">Revoke</Button>
                    </form>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
