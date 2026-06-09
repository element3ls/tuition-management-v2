"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExamQuestion } from "@/types/domain";

type EditableQuestion = {
  id: string;
  questionNumber: string;
  questionText: string;
  answerText: string;
  marks: number | null;
  sourcePages: number[];
  reviewWarning: string | null;
  sortOrder: number;
};

function toEditable(question: ExamQuestion): EditableQuestion {
  return {
    id: question.id,
    questionNumber: question.question_number,
    questionText: question.question_text,
    answerText: question.answer_text,
    marks: question.marks,
    sourcePages: question.source_pages,
    reviewWarning: question.review_warning,
    sortOrder: question.sort_order
  };
}

export function ExamReviewEditor({
  examId,
  questions,
  published
}: {
  examId: string;
  questions: ExamQuestion[];
  published: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(questions.map(toEditable));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof EditableQuestion>(index: number, key: K, value: EditableQuestion[K]) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  const submit = async (publish: boolean) => {
    if (publish && !window.confirm("Publish this entire exam to students? Published questions become read-only.")) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/admin/exams/${examId}/${publish ? "publish" : "questions"}`, {
      method: publish ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: items })
    });
    const result = (await response.json()) as { error?: string; status?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? "Could not save the exam.");
      return;
    }

    setMessage(publish ? "Exam approved and published." : "Draft saved.");
    router.refresh();
  };

  return (
    <div className="grid gap-4">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {message ? <Alert>{message}</Alert> : null}
      {items.map((question, index) => (
        <section key={question.id} className="grid gap-3 rounded-lg border border-border/70 bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_140px]">
            <label className="grid gap-1 text-sm font-medium">
              Question number
              <Input
                value={question.questionNumber}
                onChange={(event) => update(index, "questionNumber", event.target.value)}
                disabled={published || busy}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Marks
              <Input
                type="number"
                min={0}
                value={question.marks ?? ""}
                onChange={(event) => update(index, "marks", event.target.value === "" ? null : Number(event.target.value))}
                disabled={published || busy}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Source pages
              <Input
                value={question.sourcePages.join(", ")}
                onChange={(event) =>
                  update(
                    index,
                    "sourcePages",
                    event.target.value
                      .split(",")
                      .map((value) => Number(value.trim()))
                      .filter((value) => Number.isInteger(value) && value > 0)
                  )
                }
                disabled={published || busy}
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Question
            <Textarea
              value={question.questionText}
              onChange={(event) => update(index, "questionText", event.target.value)}
              className="min-h-28 font-mono text-sm"
              disabled={published || busy}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Worked answer
            <Textarea
              value={question.answerText}
              onChange={(event) => update(index, "answerText", event.target.value)}
              className="min-h-48 font-mono text-sm"
              disabled={published || busy}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Review warning
            <Textarea
              value={question.reviewWarning ?? ""}
              onChange={(event) => update(index, "reviewWarning", event.target.value.trim() ? event.target.value : null)}
              className="min-h-20"
              placeholder="Leave blank when the source and answer are clear."
              disabled={published || busy}
            />
          </label>
        </section>
      ))}
      {!published ? (
        <div className="sticky bottom-3 flex flex-wrap justify-end gap-2 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void submit(false)}>
            Save draft
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit(true)}>
            Approve and publish entire exam
          </Button>
        </div>
      ) : (
        <Alert>This exam is published and read-only. Students can now view its reviewed questions and answers.</Alert>
      )}
    </div>
  );
}
