"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/admin-ui";
import { uploadPdfToSignedUrl } from "@/lib/exams/signed-upload";
import type { Chapter, Subject } from "@/types/domain";

type UploadPreparation = {
  examId: string;
  signedUploadUrl: string;
};

export function ExamUploadForm({ subjects, chapters }: { subjects: Subject[]; chapters: Chapter[] }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [chapterIds, setChapterIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    setProgress(0);

    try {
      const form = new FormData(event.currentTarget);
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) throw new Error("Select a PDF file.");
      if (file.type !== "application/pdf") throw new Error("Only PDF files are accepted.");
      if (!subjectId) throw new Error("Select a subject.");
      if (chapterIds.length === 0) throw new Error("Select at least one covered chapter.");

      const prepareResponse = await fetch("/api/admin/exams/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          chapterIds,
          title: form.get("title"),
          description: form.get("description") || null,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size
        })
      });
      const preparation = (await prepareResponse.json()) as UploadPreparation & { error?: string };
      if (!prepareResponse.ok) throw new Error(preparation.error ?? "Could not prepare the upload.");

      await uploadPdfToSignedUrl({
        url: preparation.signedUploadUrl,
        file,
        onProgress: setProgress
      });

      const completeResponse = await fetch(`/api/admin/exams/${preparation.examId}/complete`, { method: "POST" });
      const completed = (await completeResponse.json()) as { error?: string };
      if (!completeResponse.ok) throw new Error(completed.error ?? "Could not verify the uploaded PDF.");

      router.push(`/admin/exams/${preparation.examId}`);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      setBusy(false);
    }
  };

  const availableChapters = chapters.filter((chapter) => chapter.subject_id === subjectId);

  const toggleChapter = (chapterId: string) => {
    setChapterIds((current) =>
      current.includes(chapterId) ? current.filter((id) => id !== chapterId) : [...current, chapterId]
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <Field label="Subject">
        <Select
          name="subject_id"
          value={subjectId}
          required
          disabled={busy}
          onChange={(event) => {
            setSubjectId(event.target.value);
            setChapterIds([]);
          }}
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Covered chapters">
        <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border border-border/70 bg-background/60 p-3">
          {availableChapters.map((chapter) => (
            <label key={chapter.id} className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={chapterIds.includes(chapter.id)}
                disabled={busy}
                onChange={() => toggleChapter(chapter.id)}
                className="size-4 accent-primary"
              />
              {chapter.title}
            </label>
          ))}
          {availableChapters.length === 0 ? (
            <p className="text-sm text-muted-foreground">This subject has no chapters yet.</p>
          ) : null}
        </div>
      </Field>
      <Field label="Exam title">
        <Input name="title" required disabled={busy} />
      </Field>
      <Field label="Description">
        <Textarea name="description" disabled={busy} />
      </Field>
      <Field label="Source PDF">
        <Input name="file" type="file" accept=".pdf,application/pdf" required disabled={busy} />
      </Field>
      {busy ? (
        <div className="grid gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading privately</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
      <Button type="submit" disabled={busy || !subjectId || chapterIds.length === 0}>
        {busy ? "Uploading..." : "Upload exam"}
      </Button>
    </form>
  );
}
