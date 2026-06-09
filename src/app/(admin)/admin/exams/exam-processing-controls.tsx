"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ExamStatus } from "@/types/domain";

export function ExamProcessingControls({ examId, initialStatus }: { examId: string; initialStatus: ExamStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const response = await fetch(`/api/admin/exams/${examId}/processing`, { cache: "no-store" });
    const result = (await response.json()) as { status?: ExamStatus; error?: string };
    if (!response.ok) {
      setError(result.error ?? "Could not refresh processing.");
      return;
    }

    if (result.status) setStatus(result.status);
    if (result.status === "ready" || result.status === "failed") {
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
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/exams/${examId}/processing`, { method: "POST" });
    const result = (await response.json()) as { status?: ExamStatus; error?: string };
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
          AI is extracting questions and preparing worked answers. This page will refresh when it finishes.
        </Alert>
      ) : (
        <Button type="button" onClick={start} disabled={busy}>
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {status === "failed" || status === "ready" ? "Process again" : "Generate questions and answers"}
        </Button>
      )}
    </div>
  );
}
