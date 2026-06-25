import Link from "next/link";
import { IconBook2, IconFileCheck, IconFileText, IconHelpCircle, IconVideo } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireStudentAccess } from "@/lib/auth/session";
import { logActivityEvent } from "@/lib/activity/log";
import { searchAccessibleContent } from "@/lib/search";
import { getAppData } from "@/server/data/app-data";

const resultMeta = {
  recording: { icon: IconVideo, tone: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400" },
  exam: { icon: IconFileCheck, tone: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
  chapter: { icon: IconBook2, tone: "bg-secondary text-secondary-foreground" },
  solution_material: { icon: IconFileText, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
  question: { icon: IconHelpCircle, tone: "bg-secondary text-secondary-foreground" }
} as const;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q ?? "";
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const results = q ? await searchAccessibleContent({ userId: user.id, query: q, data }) : [];

  if (q) {
    await logActivityEvent({
      userId: user.id,
      eventType: "search_performed",
      resourceType: null,
      resourceId: null,
      metadata: { q, result_count: results.length }
    });
  }

  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Search" }]} />
      <PageHeading title="Search" description="Search only returns content assigned to your account." />
      <form className="mb-6 flex gap-2" action="/search">
        <Input name="q" defaultValue={q} placeholder="Search keyword" />
        <Button type="submit">Search</Button>
      </form>
      {q && results.length === 0 ? <EmptyState title="No results" description="No assigned content matched your search." /> : null}
      <div className="grid gap-3">
        {results.map((result) => {
          const meta = resultMeta[result.type as keyof typeof resultMeta];
          const Icon = meta?.icon ?? IconHelpCircle;
          return (
            <Card key={`${result.type}-${result.id}`}>
              <CardContent className="flex gap-3 p-4">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded ${meta?.tone ?? "bg-secondary text-secondary-foreground"}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="brand">{result.type}</Badge>
                    <span className="text-xs text-muted-foreground">{result.context}</span>
                  </div>
                  <Link href={result.href} className="font-semibold hover:text-primary">
                    {result.title}
                  </Link>
                  {result.description ? <p className="mt-1 text-sm text-muted-foreground">{result.description}</p> : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
