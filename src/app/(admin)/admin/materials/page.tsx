import { formatDistanceToNow } from "date-fns";
import { PageHeading } from "@/components/layout/page-heading";
import { setMaterialStatusAction, uploadMaterialAction } from "@/features/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getAppData } from "@/server/data/app-data";

export default async function MaterialsPage() {
  const data = await getAppData();

  return (
    <>
      <PageHeading title="Solution materials" description="Manage private files, metadata, and download permissions." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Upload material</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={uploadMaterialAction} className="grid gap-3">
            <Select name="chapter_id" required>
              {data.chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </Select>
            <Select name="question_id">
              <option value="">No question</option>
              {data.questions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.title}
                </option>
              ))}
            </Select>
            <Input name="title" placeholder="Title" required />
            <Textarea name="description" placeholder="Description" />
            <Input name="file" type="file" required />
            <Select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input name="is_downloadable" type="checkbox" /> Downloadable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="is_ai_indexable" type="checkbox" /> AI indexable
            </label>
            <Button type="submit">Upload material</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Material library</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.solutionMaterials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>{material.title}</TableCell>
                  <TableCell>{material.file_name}</TableCell>
                  <TableCell>{Math.ceil(material.file_size_bytes / 1024)} KB</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(material.created_at), { addSuffix: true })}</TableCell>
                  <TableCell>
                    <Badge>{material.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <form action={setMaterialStatusAction} className="flex gap-2">
                      <input name="material_id" type="hidden" value={material.id} />
                      <Select name="status" defaultValue={material.status}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </Select>
                      <Button type="submit" variant="outline">
                        Save
                      </Button>
                    </form>
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
