import Link from "next/link";
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
      <PageHeading title="Search" description="Search only returns content assigned to your account." />
      <form className="mb-6 flex gap-2" action="/search">
        <Input name="q" defaultValue={q} placeholder="Search keyword" />
        <Button type="submit">Search</Button>
      </form>
      {q && results.length === 0 ? <EmptyState title="No results" description="No assigned content matched your search." /> : null}
      <div className="grid gap-3">
        {results.map((result) => (
          <Card key={`${result.type}-${result.id}`}>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge>{result.type}</Badge>
                <span className="text-xs text-muted-foreground">{result.context}</span>
              </div>
              <Link href={result.href} className="font-semibold hover:text-primary">
                {result.title}
              </Link>
              {result.description ? <p className="mt-1 text-sm text-muted-foreground">{result.description}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
