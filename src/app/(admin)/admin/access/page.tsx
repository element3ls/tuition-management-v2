import { AdminDialog, CreateButton, EmptyTable, StatusBadge } from "@/components/admin/admin-ui";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { revokeAccessGrantAction } from "@/features/admin/actions";
import { getAppData } from "@/server/data/app-data";
import { AccessGrantForm } from "@/app/(admin)/admin/access/access-grant-form";

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
            <AccessGrantForm data={data} />
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
