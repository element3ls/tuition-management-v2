import { AdminDialog, CreateButton, EditButton, EmptyTable, Field } from "@/components/admin/admin-ui";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createTagAction, updateTagAction } from "@/features/admin/actions";
import { getAppData } from "@/server/data/app-data";

export default async function TagsPage() {
  const data = await getAppData();

  return (
    <>
      <PageHeading
        title="Tags"
        eyebrow="Tags"
        description="Edit keyword labels and slugs for content discovery and AI metadata."
        actions={
          <AdminDialog title="Create tag" trigger={<CreateButton>New tag</CreateButton>}>
            <form action={createTagAction} className="grid gap-3" data-mutation-form>
              <Field label="Name">
                <Input name="name" required />
              </Field>
              <Button type="submit">Create tag</Button>
            </form>
          </AdminDialog>
        }
      />
      <div className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-[110px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.tags.length === 0 ? <EmptyTable colSpan={3} label="No tags yet." /> : null}
            {data.tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{tag.slug}</TableCell>
                <TableCell className="text-right">
                  <AdminDialog title="Edit tag" trigger={<EditButton />}>
                    <form action={updateTagAction} className="grid gap-3" data-mutation-form>
                      <input name="tag_id" type="hidden" value={tag.id} />
                      <Field label="Name">
                        <Input name="name" defaultValue={tag.name} required />
                      </Field>
                      <Field label="Slug">
                        <Input name="slug" defaultValue={tag.slug} required />
                      </Field>
                      <Button type="submit">Save changes</Button>
                    </form>
                  </AdminDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
