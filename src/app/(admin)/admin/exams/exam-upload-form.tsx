"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/admin-ui";
import type { Chapter } from "@/types/domain";

type UploadPreparation = {
  examId: string;
  bucket: string;
  path: string;
  token: string;
  uploadEndpoint: string;
};

export function ExamUploadForm({ chapters }: { chapters: Chapter[] }) {
  const router = useRouter();
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

      const prepareResponse = await fetch("/api/admin/exams/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: form.get("chapter_id"),
          title: form.get("title"),
          description: form.get("description") || null,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size
        })
      });
      const preparation = (await prepareResponse.json()) as UploadPreparation & { error?: string };
      if (!prepareResponse.ok) throw new Error(preparation.error ?? "Could not prepare the upload.");

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: preparation.uploadEndpoint,
          retryDelays: [0, 1000, 3000, 5000, 10000],
          chunkSize: 6 * 1024 * 1024,
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          headers: { "x-signature": preparation.token },
          metadata: {
            bucketName: preparation.bucket,
            objectName: preparation.path,
            contentType: file.type,
            cacheControl: "3600"
          },
          onError: reject,
          onProgress: (uploaded, total) => setProgress(Math.round((uploaded / total) * 100)),
          onSuccess: () => resolve()
        });
        upload.start();
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

  return (
    <form onSubmit={submit} className="grid gap-4">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <Field label="Chapter">
        <Select name="chapter_id" required disabled={busy}>
          {chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.title}
            </option>
          ))}
        </Select>
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
      <Button type="submit" disabled={busy || chapters.length === 0}>
        {busy ? "Uploading..." : "Upload exam"}
      </Button>
    </form>
  );
}
