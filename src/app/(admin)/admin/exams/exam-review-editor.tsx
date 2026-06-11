"use client";

import React, { useState } from "react";
import DOMPurify from "dompurify";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExamQuestionList } from "@/components/content/exam-question-list";
import { ProtectedExamViewer } from "@/components/content/protected-exam-viewer";
import { ExamAssetUploader } from "@/app/(admin)/admin/exams/exam-asset-uploader";
import { PdfCropTool } from "@/app/(admin)/admin/exams/pdf-crop-tool";
import type { ExamAsset, ExamAssetRole, ExamIntakeMode, ExamQuestion } from "@/types/domain";

type EditableAsset = {
  id: string;
  role: Extract<ExamAssetRole, "question_image" | "answer_image" | "question_visual" | "answer_visual">;
  sortOrder: number;
  altText: string | null;
};

type EditableQuestion = {
  id: string;
  questionNumber: string;
  questionText: string | null;
  answerText: string | null;
  questionHtml: string | null;
  answerHtml: string | null;
  questionFormat: "markdown" | "html" | "image";
  answerFormat: "markdown" | "html" | "image";
  marks: number | null;
  sourcePages: number[];
  reviewWarning: string | null;
  requiresVisual: boolean;
  visualNotNeeded: boolean;
  sortOrder: number;
  assets: EditableAsset[];
};

function formatsForMode(mode: ExamIntakeMode) {
  if (mode === "teacher_html") return { questionFormat: "markdown" as const, answerFormat: "html" as const };
  if (mode === "handwritten_images") return { questionFormat: "image" as const, answerFormat: "image" as const };
  return { questionFormat: "markdown" as const, answerFormat: "markdown" as const };
}

function toEditable(question: ExamQuestion, assets: ExamAsset[]): EditableQuestion {
  return {
    id: question.id,
    questionNumber: question.question_number,
    questionText: question.question_text,
    answerText: question.answer_text,
    questionHtml: question.question_html,
    answerHtml: question.answer_html,
    questionFormat: question.question_format,
    answerFormat: question.answer_format,
    marks: question.marks,
    sourcePages: question.source_pages,
    reviewWarning: question.review_warning,
    requiresVisual: question.requires_visual,
    visualNotNeeded: question.visual_not_needed,
    sortOrder: question.sort_order,
    assets: assets
      .filter((asset) => asset.question_id === question.id && asset.variant === "display")
      .filter(
        (asset): asset is ExamAsset & { role: EditableAsset["role"] } =>
          ["question_image", "answer_image", "question_visual", "answer_visual"].includes(asset.role)
      )
      .map((asset) => ({
        id: asset.id,
        role: asset.role,
        sortOrder: asset.sort_order,
        altText: asset.alt_text
      }))
  };
}

function newQuestion(mode: ExamIntakeMode, sortOrder: number): EditableQuestion {
  return {
    id: crypto.randomUUID(),
    questionNumber: String(sortOrder),
    questionText: mode === "handwritten_images" ? null : "",
    answerText: mode === "ai_solved" ? "" : null,
    questionHtml: null,
    answerHtml: mode === "teacher_html" ? "" : null,
    ...formatsForMode(mode),
    marks: null,
    sourcePages: [],
    reviewWarning: null,
    requiresVisual: false,
    visualNotNeeded: false,
    sortOrder,
    assets: []
  };
}

function previewQuestion(question: EditableQuestion) {
  return {
    ...question,
    questionHtml: question.questionHtml ? DOMPurify.sanitize(question.questionHtml) : null,
    answerHtml: question.answerHtml ? DOMPurify.sanitize(question.answerHtml) : null
  };
}

export function ExamReviewEditor({
  examId,
  intakeMode,
  examTitle,
  examDescription,
  questions,
  assets,
  published
}: {
  examId: string;
  intakeMode: ExamIntakeMode;
  examTitle: string;
  examDescription: string | null;
  questions: ExamQuestion[];
  assets: ExamAsset[];
  published: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(questions.map((question) => toEditable(question, assets)));
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizeOrder = (questionsToOrder: EditableQuestion[]) =>
    questionsToOrder.map((question, index) => ({ ...question, sortOrder: index + 1 }));

  const update = <K extends keyof EditableQuestion>(index: number, key: K, value: EditableQuestion[K]) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return normalizeOrder(next);
    });
  };

  const addAssets = (questionIndex: number, uploaded: ExamAsset[]) => {
    setItems((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              assets: [
                ...question.assets,
                ...uploaded.map((asset, offset) => ({
                  id: asset.id,
                  role: asset.role as EditableAsset["role"],
                  sortOrder: question.assets.length + offset,
                  altText: asset.alt_text
                }))
              ]
            }
          : question
      )
    );
  };

  const updateAsset = (questionIndex: number, assetIndex: number, patch: Partial<EditableAsset>) => {
    setItems((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              assets: question.assets.map((asset, indexOfAsset) =>
                indexOfAsset === assetIndex ? { ...asset, ...patch } : asset
              )
            }
          : question
      )
    );
  };

  const moveAsset = (questionIndex: number, assetIndex: number, direction: -1 | 1) => {
    setItems((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;
        const target = assetIndex + direction;
        if (target < 0 || target >= question.assets.length) return question;
        const next = [...question.assets];
        [next[assetIndex], next[target]] = [next[target], next[assetIndex]];
        return { ...question, assets: next.map((asset, order) => ({ ...asset, sortOrder: order })) };
      })
    );
  };

  const submit = async (publish: boolean) => {
    if (items.length === 0) {
      setError("Add at least one question before saving.");
      return;
    }
    if (publish && !window.confirm("Publish this entire exam to students? Published questions become read-only.")) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/admin/exams/${examId}/${publish ? "publish" : "questions"}`, {
      method: publish ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: items })
    });
    const result = (await response.json()) as { error?: string };
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-2">
        <p className="px-2 text-sm text-muted-foreground">Preview uses current unsaved edits.</p>
        <div className="flex gap-1" role="group" aria-label="Exam review view">
          <Button type="button" size="sm" variant={view === "edit" ? "default" : "ghost"} onClick={() => setView("edit")}>
            Edit questions
          </Button>
          <Button type="button" size="sm" variant={view === "preview" ? "default" : "ghost"} onClick={() => setView("preview")}>
            Student preview
          </Button>
        </div>
      </div>

      {view === "edit" ? (
        <>
          {items.map((question, index) => (
            <section key={question.id} className="grid gap-3 rounded-lg border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Question {question.questionNumber || index + 1}</h3>
                {!published ? (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Move question ${question.questionNumber} up`}
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Move question ${question.questionNumber} down`}
                      disabled={index === items.length - 1}
                      onClick={() => moveQuestion(index, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      aria-label={`Delete question ${question.questionNumber}`}
                      onClick={() => setItems((current) => normalizeOrder(current.filter((_, itemIndex) => itemIndex !== index)))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px_140px]">
                <label className="grid gap-1 text-sm font-medium">
                  Question number
                  <Input value={question.questionNumber} onChange={(event) => update(index, "questionNumber", event.target.value)} disabled={published || busy} />
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

              {question.questionFormat === "markdown" ? (
                <label className="grid gap-1 text-sm font-medium">
                  Question Markdown
                  <Textarea
                    value={question.questionText ?? ""}
                    onChange={(event) => update(index, "questionText", event.target.value)}
                    className="min-h-28 font-mono text-sm"
                    disabled={published || busy}
                  />
                </label>
              ) : null}
              {question.answerFormat === "markdown" ? (
                <label className="grid gap-1 text-sm font-medium">
                  Worked answer Markdown
                  <Textarea
                    value={question.answerText ?? ""}
                    onChange={(event) => update(index, "answerText", event.target.value)}
                    className="min-h-48 font-mono text-sm"
                    disabled={published || busy}
                  />
                </label>
              ) : null}
              {question.answerFormat === "html" ? (
                <label className="grid gap-1 text-sm font-medium">
                  Teacher answer HTML
                  <Textarea
                    value={question.answerHtml ?? ""}
                    onChange={(event) => update(index, "answerHtml", event.target.value)}
                    className="min-h-48 font-mono text-sm"
                    disabled={published || busy}
                  />
                </label>
              ) : null}

              {!published && intakeMode === "handwritten_images" ? (
                <div className="grid gap-3">
                  <div>
                    <p className="mb-1 text-sm font-medium">Question images</p>
                    <ExamAssetUploader examId={examId} role="question_image" onUploaded={(uploaded) => addAssets(index, uploaded)} />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium">Answer images</p>
                    <ExamAssetUploader examId={examId} role="answer_image" onUploaded={(uploaded) => addAssets(index, uploaded)} />
                  </div>
                </div>
              ) : null}

              {question.assets.length > 0 ? (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Attached images and visuals</p>
                  {question.assets.map((asset, assetIndex) => (
                    <div key={asset.id} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[100px_150px_1fr_auto]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/exams/${examId}/assets/${asset.id}`}
                        alt={asset.altText ?? asset.role}
                        className="h-20 w-24 rounded border object-contain"
                      />
                      <select
                        className="rounded-md border bg-background px-2 text-sm"
                        value={asset.role}
                        disabled={published}
                        onChange={(event) => updateAsset(index, assetIndex, { role: event.target.value as EditableAsset["role"] })}
                      >
                        {intakeMode === "handwritten_images" ? (
                          <>
                            <option value="question_image">Question image</option>
                            <option value="answer_image">Answer image</option>
                          </>
                        ) : (
                          <>
                            <option value="question_visual">Question visual</option>
                            <option value="answer_visual">Answer visual</option>
                          </>
                        )}
                      </select>
                      <Input
                        value={asset.altText ?? ""}
                        placeholder="Accessible description"
                        disabled={published}
                        onChange={(event) => updateAsset(index, assetIndex, { altText: event.target.value || null })}
                      />
                      {!published ? (
                        <div className="flex">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Move ${asset.altText ?? asset.role} up`}
                            onClick={() => moveAsset(index, assetIndex, -1)}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Move ${asset.altText ?? asset.role} down`}
                            onClick={() => moveAsset(index, assetIndex, 1)}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Remove ${asset.altText ?? asset.role}`}
                            onClick={() =>
                              update(
                                index,
                                "assets",
                                question.assets
                                  .filter((_, indexOfAsset) => indexOfAsset !== assetIndex)
                                  .map((item, order) => ({ ...item, sortOrder: order }))
                              )
                            }
                          >
                            <X />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-2 rounded-md border bg-muted/20 p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={question.requiresVisual}
                    disabled={published}
                    onChange={(event) => update(index, "requiresVisual", event.target.checked)}
                  />
                  This question requires a graph, diagram, table or other visual
                </label>
                {question.requiresVisual ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={question.visualNotNeeded}
                      disabled={published}
                      onChange={(event) => update(index, "visualNotNeeded", event.target.checked)}
                    />
                    Teacher confirmed that a separate visual asset is unnecessary
                  </label>
                ) : null}
              </div>

              <label className="grid gap-1 text-sm font-medium">
                Review warning
                <Textarea
                  value={question.reviewWarning ?? ""}
                  onChange={(event) => update(index, "reviewWarning", event.target.value.trim() ? event.target.value : null)}
                  className="min-h-20"
                  placeholder="Leave blank after resolving every issue."
                  disabled={published || busy}
                />
              </label>

              {!published && intakeMode !== "handwritten_images" ? (
                <details>
                  <summary className="cursor-pointer text-sm font-medium">Crop a graph or diagram from the source PDF</summary>
                  <div className="mt-3">
                    <PdfCropTool examId={examId} onUploaded={(asset) => addAssets(index, [asset])} />
                  </div>
                </details>
              ) : null}
            </section>
          ))}
          {!published ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setItems((current) => [...current, newQuestion(intakeMode, current.length + 1)])}
            >
              <Plus />
              Add question
            </Button>
          ) : null}
        </>
      ) : (
        <section className="rounded-xl border bg-background p-4 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-border/70 pb-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Student preview</p>
            <h1 className="text-2xl font-semibold">{examTitle}</h1>
            {examDescription ? <p className="mt-1 text-sm text-muted-foreground">{examDescription}</p> : null}
          </div>
          <ProtectedExamViewer watermark="Student Name | student@example.com | Preview">
            <ExamQuestionList examId={examId} questions={items.map(previewQuestion)} />
          </ProtectedExamViewer>
        </section>
      )}

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
        <Alert>This exam is published and read-only. Students can view its reviewed questions, answers and visuals.</Alert>
      )}
    </div>
  );
}
