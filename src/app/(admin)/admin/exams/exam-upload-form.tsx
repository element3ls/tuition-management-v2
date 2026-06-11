"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/admin-ui";
import { uploadFileToSignedUrl } from "@/lib/exams/signed-upload";
import type { Chapter, ExamIntakeMode, Subject } from "@/types/domain";

type PreparedUpload = {
  clientId: string;
  assetId: string;
  signedUploadUrl: string;
};

type UploadPreparation = {
  examId: string;
  uploads: PreparedUpload[];
};

const modeLabels: Record<ExamIntakeMode, string> = {
  ai_solved: "AI transcribes and solves",
  teacher_html: "AI transcribes, teacher HTML answers",
  handwritten_images: "Handwritten question and answer images"
};

function normalizedMime(file: File) {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith(".html")) return "text/html";
  return "application/octet-stream";
}

export function ExamUploadForm({ subjects, chapters }: { subjects: Subject[]; chapters: Chapter[] }) {
  const router = useRouter();
  const [intakeMode, setIntakeMode] = useState<ExamIntakeMode>("ai_solved");
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
      if (!subjectId) throw new Error("Select a subject.");
      if (chapterIds.length === 0) throw new Error("Select at least one covered chapter.");

      const files = new Map<string, File>();
      const assets: Array<{
        clientId: string;
        role: "source_pdf" | "answer_html" | "html_image";
        fileName: string;
        mimeType: string;
        sizeBytes: number;
      }> = [];

      if (intakeMode !== "handwritten_images") {
        const source = form.get("source_pdf");
        if (!(source instanceof File) || source.size === 0) throw new Error("Select a source PDF.");
        if (source.type !== "application/pdf") throw new Error("The source paper must be a PDF.");
        files.set("source_pdf", source);
        assets.push({
          clientId: "source_pdf",
          role: "source_pdf",
          fileName: source.name,
          mimeType: source.type,
          sizeBytes: source.size
        });
      }

      if (intakeMode === "teacher_html") {
        const answerHtml = form.get("answer_html");
        if (!(answerHtml instanceof File) || answerHtml.size === 0) throw new Error("Select the teacher answer HTML file.");
        const htmlMime = normalizedMime(answerHtml);
        if (!["text/html", "application/xhtml+xml"].includes(htmlMime)) throw new Error("Teacher answers must be an HTML file.");
        files.set("answer_html", answerHtml);
        assets.push({
          clientId: "answer_html",
          role: "answer_html",
          fileName: answerHtml.name,
          mimeType: htmlMime,
          sizeBytes: answerHtml.size
        });

        for (const [index, image] of form.getAll("html_images").entries()) {
          if (!(image instanceof File) || image.size === 0) continue;
          if (!["image/png", "image/jpeg", "image/webp"].includes(image.type)) {
            throw new Error(`Unsupported HTML image: ${image.name}.`);
          }
          const clientId = `html_image_${index}`;
          files.set(clientId, image);
          assets.push({
            clientId,
            role: "html_image",
            fileName: image.name,
            mimeType: image.type,
            sizeBytes: image.size
          });
        }
      }

      const prepareResponse = await fetch("/api/admin/exams/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeMode,
          subjectId,
          chapterIds,
          title: form.get("title"),
          description: form.get("description") || null,
          assets
        })
      });
      const preparation = (await prepareResponse.json()) as UploadPreparation & { error?: string };
      if (!prepareResponse.ok) throw new Error(preparation.error ?? "Could not prepare the exam.");

      for (const [index, upload] of preparation.uploads.entries()) {
        const file = files.get(upload.clientId);
        if (!file) throw new Error("A prepared upload no longer matches its selected file.");
        await uploadFileToSignedUrl({
          url: upload.signedUploadUrl,
          file,
          onProgress: (fileProgress) =>
            setProgress(Math.round(((index + fileProgress / 100) / preparation.uploads.length) * 100))
        });
        const completedResponse = await fetch(
          `/api/admin/exams/${preparation.examId}/assets/${upload.assetId}/complete`,
          { method: "POST" }
        );
        const completed = (await completedResponse.json()) as { error?: string };
        if (!completedResponse.ok) throw new Error(completed.error ?? `Could not verify ${file.name}.`);
      }

      setProgress(100);
      router.push(`/admin/exams/${preparation.examId}`);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Exam creation failed.");
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
      <Field label="Intake mode">
        <Select value={intakeMode} disabled={busy} onChange={(event) => setIntakeMode(event.target.value as ExamIntakeMode)}>
          {Object.entries(modeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Alert>
        {intakeMode === "ai_solved"
          ? "AI will transcribe the paper and prepare worked Markdown answers for teacher review."
          : intakeMode === "teacher_html"
            ? 'AI will only transcribe questions. Answers must use <section data-question-number="..."> in the HTML file.'
            : "Create the exam first, then pair ordered question and answer images on the review page."}
      </Alert>
      <Field label="Subject">
        <Select
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
            <label key={chapter.id} className="flex items-center gap-2 text-sm font-medium">
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
          {availableChapters.length === 0 ? <p className="text-sm text-muted-foreground">This subject has no chapters yet.</p> : null}
        </div>
      </Field>
      <Field label="Exam title">
        <Input name="title" required disabled={busy} />
      </Field>
      <Field label="Description">
        <Textarea name="description" disabled={busy} />
      </Field>
      {intakeMode !== "handwritten_images" ? (
        <Field label="Source question paper PDF">
          <Input name="source_pdf" type="file" accept=".pdf,application/pdf" required disabled={busy} />
        </Field>
      ) : null}
      {intakeMode === "teacher_html" ? (
        <>
          <Field label="Teacher answer HTML">
            <Input name="answer_html" type="file" accept=".html,text/html,application/xhtml+xml" required disabled={busy} />
          </Field>
          <Field label="Optional HTML answer images">
            <Input name="html_images" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} />
            <p className="mt-1 text-xs text-muted-foreground">
              Reference selected images as <code>assets/filename.png</code> inside the HTML.
            </p>
          </Field>
        </>
      ) : null}
      {busy ? (
        <div className="grid gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading and verifying private assets</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
      <Button type="submit" disabled={busy || !subjectId || chapterIds.length === 0}>
        {busy ? "Creating exam..." : intakeMode === "handwritten_images" ? "Create image exam" : "Upload exam"}
      </Button>
    </form>
  );
}
