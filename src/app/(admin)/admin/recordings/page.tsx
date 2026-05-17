import { PageHeading } from "@/components/layout/page-heading";
import { createRecordingAction, setRecordingStatusAction } from "@/features/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getAppData } from "@/server/data/app-data";

export default async function RecordingsPage() {
  const data = await getAppData();

  return (
    <>
      <PageHeading title="Recordings" description="Manage YouTube unlisted embeds and transcript metadata." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create recording</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRecordingAction} className="grid gap-3">
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
            <Input name="youtube_video_id" placeholder="YouTube video ID" required />
            <Input name="duration_seconds" type="number" placeholder="Duration seconds" />
            <Textarea name="description" placeholder="Description" />
            <Textarea name="transcript_text" placeholder="Transcript text" />
            <Select name="transcript_source" defaultValue="none">
              <option value="none">None</option>
              <option value="manual">Manual</option>
              <option value="youtube">YouTube</option>
              <option value="generated">Generated</option>
            </Select>
            <Select name="transcript_review_status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
            </Select>
            <Select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input name="is_ai_indexable" type="checkbox" /> AI indexable
            </label>
            <Button type="submit">Create recording</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recording library</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>YouTube ID</TableHead>
                <TableHead>Transcript</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recordings.map((recording) => (
                <TableRow key={recording.id}>
                  <TableCell>{recording.title}</TableCell>
                  <TableCell>{data.chapters.find((chapter) => chapter.id === recording.chapter_id)?.title}</TableCell>
                  <TableCell>{recording.youtube_video_id}</TableCell>
                  <TableCell>{recording.transcript_review_status}</TableCell>
                  <TableCell>
                    <Badge>{recording.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <form action={setRecordingStatusAction} className="flex gap-2">
                      <input name="recording_id" type="hidden" value={recording.id} />
                      <Select name="status" defaultValue={recording.status}>
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
