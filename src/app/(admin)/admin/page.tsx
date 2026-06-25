import Link from "next/link";
import { formatDistanceToNow, subDays, subMonths } from "date-fns";
import {
  IconBook2,
  IconBooks,
  IconFileCheck,
  IconFiles,
  IconStack2,
  IconUsers,
  IconUsersGroup,
  IconVideo,
  IconActivity,
  IconUserPlus,
  IconKey,
  IconUpload,
  IconCheck
} from "@tabler/icons-react";
import { StatusBadge } from "@/components/admin/admin-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { getAppData } from "@/server/data/app-data";
import type { AuditAction } from "@/types/domain";

const auditActionIcons: Partial<Record<AuditAction, typeof IconActivity>> = {
  user_created: IconUserPlus,
  access_granted: IconKey,
  access_revoked: IconKey,
  exam_uploaded: IconUpload,
  material_uploaded: IconUpload,
  exam_published: IconCheck,
  content_published: IconCheck
};

export default async function AdminDashboardPage() {
  const data = await getAppData();

  const newStudentsThisMonth = data.studentProfiles.filter(
    (student) => new Date(student.created_at) >= subMonths(new Date(), 1)
  ).length;
  const newRecordingsThisWeek = data.recordings.filter(
    (recording) => new Date(recording.created_at) >= subDays(new Date(), 7)
  ).length;

  const cards = [
    ["Students", data.studentProfiles.length, IconUsers, `+${newStudentsThisMonth} this month`],
    ["Groups", data.groups.length, IconUsersGroup, null],
    ["Years", data.years.length, IconStack2, null],
    ["Subjects", data.subjects.length, IconBook2, null],
    ["Chapters", data.chapters.length, IconBooks, null],
    ["Recordings", data.recordings.length, IconVideo, `+${newRecordingsThisWeek} this week`],
    ["Solution materials", data.solutionMaterials.length, IconFiles, null],
    ["Exams", data.exams.length, IconFileCheck, null]
  ] as const;

  const recentAudit = data.auditLogs.slice(0, 5);
  const examsNeedingReview = data.exams.filter((exam) => exam.status !== "published").slice(0, 5);

  return (
    <>
      <PageHeading
        eyebrow="Operations console"
        title="Admin dashboard"
        description="Overview of students, groups, content, recordings, materials, and exams."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, Icon, delta]) => (
          <Card key={label} className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {label}
              </CardTitle>
              <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-semibold tracking-tight">{value}</p>
              {delta ? <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{delta}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Recent audit events</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentAudit.map((log) => {
                  const Icon = auditActionIcons[log.action] ?? IconActivity;
                  const actor = data.profiles.find((profile) => profile.id === log.actor_id);
                  return (
                    <li key={log.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{log.action.replaceAll("_", " ")}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {actor?.full_name ?? "System"} · {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Exams needing review</CardTitle>
          </CardHeader>
          <CardContent>
            {examsNeedingReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">All exams are published.</p>
            ) : (
              <ul className="divide-y divide-border">
                {examsNeedingReview.map((exam) => {
                  const subject = data.subjects.find((item) => item.id === exam.subject_id);
                  return (
                    <li key={exam.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/exams`} className="truncate text-sm font-medium hover:text-primary">
                          {exam.title}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{subject?.name ?? "Unassigned"}</p>
                      </div>
                      <StatusBadge status={exam.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
