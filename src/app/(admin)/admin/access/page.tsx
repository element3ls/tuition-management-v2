import { PageHeading } from "@/components/layout/page-heading";
import { createAccessGrantAction, revokeAccessGrantAction } from "@/features/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppData } from "@/server/data/app-data";

export default async function AccessPage() {
  const data = await getAppData();

  return (
    <>
      <PageHeading title="Access grants" description="Grant direct or group access to syllabus resources and materials." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create grant</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAccessGrantAction} className="grid gap-3">
            <Select name="grantee_type">
              <option value="group">Group</option>
              <option value="user">Student</option>
            </Select>
            <Select name="grantee_id">
              {data.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  Group: {group.name}
                </option>
              ))}
              {data.studentProfiles.map((student) => {
                const profile = data.profiles.find((item) => item.id === student.user_id);
                return (
                  <option key={student.user_id} value={student.user_id}>
                    Student: {profile?.full_name ?? student.user_id}
                  </option>
                );
              })}
            </Select>
            <Select name="resource_type">
              <option value="year">Year</option>
              <option value="subject">Subject</option>
              <option value="chapter">Chapter</option>
              <option value="question">Question</option>
              <option value="recording">Recording</option>
              <option value="solution_material">Solution material</option>
            </Select>
            <Select name="resource_id">
              {data.years.map((year) => (
                <option key={year.id} value={year.id}>
                  Year: {year.name}
                </option>
              ))}
              {data.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  Subject: {subject.name}
                </option>
              ))}
              {data.chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  Chapter: {chapter.title}
                </option>
              ))}
              {data.questions.map((question) => (
                <option key={question.id} value={question.id}>
                  Question: {question.title}
                </option>
              ))}
              {data.recordings.map((recording) => (
                <option key={recording.id} value={recording.id}>
                  Recording: {recording.title}
                </option>
              ))}
              {data.solutionMaterials.map((material) => (
                <option key={material.id} value={material.id}>
                  Material: {material.title}
                </option>
              ))}
            </Select>
            <Select name="permission">
              <option value="view">View</option>
              <option value="download">Download</option>
            </Select>
            <Input name="starts_at" type="datetime-local" />
            <Input name="expires_at" type="datetime-local" />
            <Button type="submit">Create grant</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active and historical grants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grantee</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.accessGrants.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell>{grant.grantee_type === "group" ? data.groups.find((group) => group.id === grant.grantee_id)?.name : data.profiles.find((profile) => profile.id === grant.grantee_id)?.full_name}</TableCell>
                  <TableCell>
                    {grant.resource_type}: {grant.resource_id}
                  </TableCell>
                  <TableCell>{grant.permission}</TableCell>
                  <TableCell>
                    {grant.starts_at ?? "now"} to {grant.expires_at ?? "no expiry"}
                  </TableCell>
                  <TableCell>
                    <Badge>{grant.revoked_at ? "revoked" : "active"}</Badge>
                  </TableCell>
                  <TableCell>
                    {!grant.revoked_at ? (
                      <form action={revokeAccessGrantAction}>
                        <input name="grant_id" type="hidden" value={grant.id} />
                        <Button type="submit" variant="outline">
                          Revoke
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
