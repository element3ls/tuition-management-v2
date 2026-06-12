import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeading } from "@/components/layout/page-heading";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppData } from "@/server/data/app-data";

export default async function AuditLogsPage() {
  const data = await getAppData();

  return (
    <>
      <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Audit trail" }]} />
      <PageHeading title="Audit trail" description="Sensitive admin actions recorded with actor, action, resource, and timestamp." />
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
              {data.auditLogs.map((log) => {
                const actorName = data.profiles.find((profile) => profile.id === log.actor_id)?.full_name ?? "System";
                return (
                  <TableRow key={log.id}>
                    <TableCell><span className="font-mono text-[12px]">{new Date(log.created_at).toLocaleString()}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={actorName} size="sm" />
                        {actorName}
                      </div>
                    </TableCell>
                    <TableCell><span className="font-mono text-[12px] text-muted-foreground">{log.action}</span></TableCell>
                    <TableCell>
                      {log.resource_type} {log.resource_id}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
