import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppData } from "@/server/data/app-data";

export default async function AuditLogsPage() {
  const data = await getAppData();

  return (
    <>
      <PageHeading title="Audit logs" description="Sensitive admin actions recorded with actor, action, resource, and timestamp." />
      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell>{data.profiles.find((profile) => profile.id === log.actor_id)?.full_name ?? "System"}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    {log.resource_type} {log.resource_id}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
