import { formatDistanceToNow } from "date-fns";
import { AdminDialog, CheckField, CreateButton, EditButton, EmptyTable, Field, StatusBadge, statusOptions } from "@/components/admin/admin-ui";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { updateMaterialAction, uploadMaterialAction } from "@/features/admin/actions";
import { getAppData } from "@/server/data/app-data";

export default async function MaterialsPage() {
  const data = await getAppData();

  const materialFields = (material?: (typeof data.solutionMaterials)[number]) => (
    <>
      {material ? <input name="material_id" type="hidden" value={material.id} /> : null}
      <Field label="Chapter">
        <Select name="chapter_id" defaultValue={material?.chapter_id} required>
          {data.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
        </Select>
      </Field>
      <Field label="Question">
        <Select name="question_id" defaultValue={material?.question_id ?? ""}>
          <option value="">No question</option>
          {data.questions.map((question) => <option key={question.id} value={question.id}>{question.title}</option>)}
        </Select>
      </Field>
      <Field label="Title"><Input name="title" defaultValue={material?.title ?? ""} required /></Field>
      <Field label="Description"><Textarea name="description" defaultValue={material?.description ?? ""} /></Field>
      <Field label="Status">
        <Select name="status" defaultValue={material?.status ?? "draft"}>
          {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
        </Select>
      </Field>
      <CheckField name="is_downloadable" label="Downloadable" defaultChecked={material?.is_downloadable} />
      <CheckField name="is_ai_indexable" label="AI indexable" defaultChecked={material?.is_ai_indexable} />
    </>
  );

  return (
    <>
      <PageHeading
        title="Solution materials"
        description="Maintain private solution files, metadata, download permissions, and publishing status."
        actions={
          <AdminDialog title="Upload material" description="File replacement is intentionally deferred; this creates a new private file." trigger={<CreateButton>Upload material</CreateButton>}>
            <form action={uploadMaterialAction} className="grid gap-3">
              {materialFields()}
              <Field label="File">
                <Input name="file" type="file" required />
              </Field>
              <Button type="submit">Upload material</Button>
            </form>
          </AdminDialog>
        }
      />
      <div className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[110px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.solutionMaterials.length === 0 ? <EmptyTable colSpan={6} label="No materials yet." /> : null}
            {data.solutionMaterials.map((material) => (
              <TableRow key={material.id}>
                <TableCell><div className="font-medium">{material.title}</div><div className="text-xs text-muted-foreground">{material.description ?? "No description"}</div></TableCell>
                <TableCell>{material.file_name}</TableCell>
                <TableCell>{Math.ceil(material.file_size_bytes / 1024)} KB</TableCell>
                <TableCell>{formatDistanceToNow(new Date(material.created_at), { addSuffix: true })}</TableCell>
                <TableCell><StatusBadge status={material.status} /></TableCell>
                <TableCell className="text-right">
                  <AdminDialog title="Edit material metadata" trigger={<EditButton />}>
                    <form action={updateMaterialAction} className="grid gap-3">
                      {materialFields(material)}
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
