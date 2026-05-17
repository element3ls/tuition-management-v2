import { PageHeading } from "@/components/layout/page-heading";
import { createTagAction } from "@/features/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAppData } from "@/server/data/app-data";

export default async function TagsPage() {
  const data = await getAppData();

  return (
    <>
      <PageHeading title="Tags" description="Tag content for keyword discovery and future AI metadata." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create tag</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTagAction} className="flex gap-2">
            <Input name="name" placeholder="Tag name" required />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {data.tags.map((tag) => (
            <Badge key={tag.id}>{tag.name}</Badge>
          ))}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
