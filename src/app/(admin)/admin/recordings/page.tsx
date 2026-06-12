import { AdminDialog, CheckField, CreateButton, EditButton, EmptyTable, Field, StatusBadge, statusOptions } from "@/components/admin/admin-ui";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createRecordingAction, updateRecordingAction } from "@/features/admin/actions";
import { getAppData } from "@/server/data/app-data";

const transcriptSources = ["none", "manual", "youtube", "generated"] as const;
const transcriptStatuses = ["draft", "reviewed", "approved"] as const;

export default async function RecordingsPage() {
  const data = await getAppData();

  const recordingForm = (recording?: (typeof data.recordings)[number]) => (
    <>
      {recording ? <input name="recording_id" type="hidden" value={recording.id} /> : null}
      <Field label="Chapter">
        <Select name="chapter_id" defaultValue={recording?.chapter_id} required>
          {data.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
        </Select>
      </Field>
      <Field label="Question">
        <Select name="question_id" defaultValue={recording?.question_id ?? ""}>
          <option value="">No question</option>
          {data.questions.map((question) => <option key={question.id} value={question.id}>{question.title}</option>)}
        </Select>
      </Field>
      <Field label="Title"><Input name="title" defaultValue={recording?.title ?? ""} required /></Field>
      <Field label="YouTube video ID"><Input name="youtube_video_id" defaultValue={recording?.youtube_video_id ?? ""} required /></Field>
      <Field label="Duration seconds"><Input name="duration_seconds" type="number" defaultValue={recording?.duration_seconds ?? ""} /></Field>
      <Field label="Description"><Textarea name="description" defaultValue={recording?.description ?? ""} /></Field>
      <Field label="Transcript text"><Textarea name="transcript_text" defaultValue={recording?.transcript_text ?? ""} /></Field>
      <Field label="Transcript source">
        <Select name="transcript_source" defaultValue={recording?.transcript_source ?? "none"}>
          {transcriptSources.map((source) => <option key={source} value={source}>{source}</option>)}
        </Select>
      </Field>
      <Field label="Transcript review">
        <Select name="transcript_review_status" defaultValue={recording?.transcript_review_status ?? "draft"}>
          {transcriptStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </Select>
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={recording?.status ?? "draft"}>
          {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
        </Select>
      </Field>
      <CheckField name="is_ai_indexable" label="AI indexable" defaultChecked={recording?.is_ai_indexable} />
    </>
  );

  return (
    <>
      <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Recordings" }]} />
      <PageHeading
        title="Recordings"
        description="Maintain YouTube embeds, chapter links, transcript metadata, and publishing status."
        actions={
          <AdminDialog title="Create recording" trigger={<CreateButton>New recording</CreateButton>}>
            <form action={createRecordingAction} className="grid gap-3" data-mutation-form>
              {recordingForm()}
              <Button type="submit">Create recording</Button>
            </form>
          </AdminDialog>
        }
      />
      <div className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Chapter</TableHead>
              <TableHead>YouTube ID</TableHead>
              <TableHead>Transcript</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[110px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.recordings.length === 0 ? <EmptyTable colSpan={6} label="No recordings yet." /> : null}
            {data.recordings.map((recording) => (
              <TableRow key={recording.id}>
                <TableCell><div className="font-medium">{recording.title}</div><div className="font-mono text-xs text-muted-foreground">{Math.round((recording.duration_seconds ?? 0) / 60)} min</div></TableCell>
                <TableCell>{data.chapters.find((chapter) => chapter.id === recording.chapter_id)?.title}</TableCell>
                <TableCell>{recording.youtube_video_id}</TableCell>
                <TableCell><StatusBadge status={recording.transcript_review_status} /></TableCell>
                <TableCell><StatusBadge status={recording.status} /></TableCell>
                <TableCell className="text-right">
                  <AdminDialog title="Edit recording" trigger={<EditButton />}>
                    <form action={updateRecordingAction} className="grid gap-3" data-mutation-form>
                      {recordingForm(recording)}
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
