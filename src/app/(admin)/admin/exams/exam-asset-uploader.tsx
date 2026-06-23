"use client";

import { useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { uploadExamAsset } from "@/lib/exams/client-assets";
import { cn } from "@/lib/utils";
import type { ExamAsset, ExamAssetRole } from "@/types/domain";

export function ExamAssetUploader({
  examId,
  role,
  multiple = true,
  label = "Upload images",
  surface = true,
  onUploaded
}: {
  examId: string;
  role: Extract<ExamAssetRole, "question_image" | "answer_image" | "question_visual" | "answer_visual">;
  multiple?: boolean;
  label?: string;
  surface?: boolean;
  onUploaded: (assets: ExamAsset[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded: ExamAsset[] = [];
      for (const file of files) {
        uploaded.push(await uploadExamAsset({ examId, file, role, rotation, altText: file.name }));
      }
      onUploaded(uploaded);
      setFiles([]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("grid gap-2", surface ? "rounded-md border bg-muted/20 p-3" : "")}>
      <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple={multiple}
          disabled={busy}
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <Select value={rotation} disabled={busy} onChange={(event) => setRotation(Number(event.target.value) as 0 | 90 | 180 | 270)}>
          <option value={0}>No rotation</option>
          <option value={90}>Rotate 90 degrees</option>
          <option value={180}>Rotate 180 degrees</option>
          <option value={270}>Rotate 270 degrees</option>
        </Select>
        <Button type="button" variant="outline" disabled={busy || files.length === 0} onClick={() => void upload()}>
          {busy ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
          {label}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
