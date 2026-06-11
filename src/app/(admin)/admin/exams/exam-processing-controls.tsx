"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ExamIntakeMode, ExamProcessingStatus } from "@/types/domain";

export function ExamProcessingControls({
  examId,
  intakeMode,
  initialStatus
}: {
  examId: string;
  intakeMode: ExamIntakeMode;
  initialStatus: ExamProcessingStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const response = await fetch(`/api/admin/exams/${examId}/processing`, { cache: "no-store" });
    const result = (await response.json()) as { status?: ExamProcessingStatus; error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not refresh processing.");
      return;
    }
    if (result.status) setStatus(result.status);
    if (result.status === "completed" || result.status === "failed") {
      setError(result.error ?? null);
      router.refresh();
    }
  }, [examId, router]);

  useEffect(() => {
    if (status !== "processing") return;
    const timeout = window.setInterval(() => void refreshStatus(), 4000);
    return () => window.clearInterval(timeout);
  }, [refreshStatus, status]);

  const start = async () => {
    if (
      status === "completed" &&
      !window.confirm("Process this exam again? The current draft question set will be replaced when processing completes.")
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/exams/${examId}/processing`, { method: "POST" });
    const result = (await response.json()) as { status?: ExamProcessingStatus; error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? "Could not start processing.");
      return;
    }
    setStatus(result.status ?? "processing");
    router.refresh();
  };

  return (
    <div className="grid gap-3">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {status === "processing" ? (
        <Alert className="flex items-center gap-2">
          <LoaderCircle className="size-4 animate-spin" />
          {intakeMode === "teacher_html"
            ? "AI is transcribing questions only. Teacher HTML answers will be mapped after transcription."
            : "AI is extracting questions and preparing worked answers."}
        </Alert>
      ) : (
        <Button type="button" onClick={start} disabled={busy}>
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {status === "completed" || status === "failed"
            ? "Process again"
            : intakeMode === "teacher_html"
              ? "Transcribe questions"
              : "Generate questions and answers"}
        </Button>
      )}
    </div>
  );
}
