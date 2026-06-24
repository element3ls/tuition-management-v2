"use client";

import React, { useState } from "react";
import DOMPurify from "dompurify";
import { useRouter } from "next/navigation";
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronRight,
  IconFileTypePdf,
  IconPhotoPlus,
  IconPlus,
  IconTrash,
  IconX
} from "@tabler/icons-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExamQuestionList } from "@/components/content/exam-question-list";
import { MarkdownLatexEditor } from "@/components/content/markdown-latex-editor";
import { ProtectedExamViewer } from "@/components/content/protected-exam-viewer";
import { ExamAssetUploader } from "@/app/(admin)/admin/exams/exam-asset-uploader";
import { PdfCropTool } from "@/app/(admin)/admin/exams/pdf-crop-tool";
import type { ExamAsset, ExamAssetPlacement, ExamAssetRole, ExamIntakeMode, ExamQuestion } from "@/types/domain";

type EditableAsset = {
  id: string;
  role: Extract<ExamAssetRole, "question_image" | "answer_image" | "question_visual" | "answer_visual">;
  sortOrder: number;
  placement: ExamAssetPlacement;
  altText: string | null;
};

type VisualUploadOptions = {
  role: Extract<ExamAssetRole, "question_visual" | "answer_visual">;
  placement: ExamAssetPlacement;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlToMarkdown(html: string) {
  if (!html.trim()) return "";
  const document = new DOMParser().parseFromString(html, "text/html");

  const renderInline = (node: ChildNode): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof Element)) return "";

    const displayMath = node.getAttribute("data-math-display");
    if (displayMath !== null) return `\n$$\n${displayMath.trim()}\n$$\n`;
    const inlineMath = node.getAttribute("data-math");
    if (inlineMath !== null) return `$${inlineMath.trim()}$`;
    const assetId = node.getAttribute("data-exam-asset-id");
    if (assetId !== null) return `\n\n${markdownInlineMarker(assetId.trim())}\n\n`;

    const content = Array.from(node.childNodes).map(renderInline).join("");
    if (node.tagName === "STRONG" || node.tagName === "B") return `**${content}**`;
    if (node.tagName === "EM" || node.tagName === "I") return `_${content}_`;
    if (node.tagName === "BR") return "\n";
    return content;
  };

  const renderBlock = (element: Element): string => {
    const content = Array.from(element.childNodes).map(renderInline).join("").trim();
    if (element.hasAttribute("data-math-display")) return renderInline(element).trim();
    if (element.hasAttribute("data-exam-asset-id")) return renderInline(element).trim();
    if (!content) return "";
    if (element.tagName === "H2") return `## ${content}`;
    if (element.tagName === "H3") return `### ${content}`;
    if (element.tagName === "H4") return `#### ${content}`;
    if (element.tagName === "LI") return `- ${content}`;
    if (element.tagName === "UL" || element.tagName === "OL") {
      return Array.from(element.children).map(renderBlock).filter(Boolean).join("\n");
    }
    return content;
  };

  return Array.from(document.body.children).map(renderBlock).filter(Boolean).join("\n\n").trim();
}

function plainMarkdownToHtml(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

function inlineMarkdownToHtml(value: string) {
  const parts: string[] = [];
  const mathPattern = /\$([^$\n]+)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathPattern.exec(value))) {
    parts.push(plainMarkdownToHtml(value.slice(lastIndex, match.index)));
    parts.push(`<span data-math="${escapeHtml(match[1].trim())}"></span>`);
    lastIndex = mathPattern.lastIndex;
  }

  parts.push(plainMarkdownToHtml(value.slice(lastIndex)));
  return parts.join("");
}

function markdownToTeacherHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let math: string[] | null = null;

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push(`<p>${inlineMarkdownToHtml(text)}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (math) {
      if (trimmed === "$$") {
        const latex = math.join("\n").trim();
        if (latex) blocks.push(`<div data-math-display="${escapeHtml(latex)}"></div>`);
        math = null;
      } else {
        math.push(line);
      }
      continue;
    }

    if (trimmed === "$$") {
      flushParagraph();
      math = [];
      continue;
    }
    const assetMatch = /^\{\{\s*exam_asset:([a-zA-Z0-9_-]+)\s*\}\}$/.exec(trimmed);
    if (assetMatch) {
      flushParagraph();
      blocks.push(htmlInlineMarker(assetMatch[1]));
      continue;
    }
    const heading = /^(#{2,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push(`<h${heading[1].length}>${inlineMarkdownToHtml(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    paragraph.push(trimmed);
  }

  if (math) {
    const latex = math.join("\n").trim();
    if (latex) blocks.push(`<div data-math-display="${escapeHtml(latex)}"></div>`);
  }
  flushParagraph();

  return blocks.join("\n").trim();
}

function toEditable(question: ExamQuestion, assets: ExamAsset[]): EditableQuestion {
  const answerMarkdown =
    question.answer_format === "html" && question.answer_html ? htmlToMarkdown(question.answer_html) : question.answer_text;

  return {
    id: question.id,
    questionNumber: question.question_number,
    questionText: question.question_text,
    answerText: answerMarkdown,
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
        placement: asset.placement ?? "after_content",
        altText: asset.alt_text
      }))
  };
}

function newQuestion(mode: ExamIntakeMode, sortOrder: number): EditableQuestion {
  return {
    id: crypto.randomUUID(),
    questionNumber: String(sortOrder),
    questionText: mode === "handwritten_images" ? null : "",
    answerText: mode === "handwritten_images" ? null : "",
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
  const answerHtml =
    question.answerFormat === "html" && question.answerText !== null
      ? markdownToTeacherHtml(question.answerText)
      : question.answerHtml;

  return {
    ...question,
    questionHtml: question.questionHtml ? DOMPurify.sanitize(question.questionHtml) : null,
    answerHtml: answerHtml ? DOMPurify.sanitize(answerHtml) : null
  };
}

function markdownInlineMarker(assetId: string) {
  return `{{exam_asset:${assetId}}}`;
}

function htmlInlineMarker(assetId: string) {
  return `<div data-exam-asset-id="${assetId}"></div>`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasInlineMarker(question: EditableQuestion, assetId: string) {
  return (
    (question.questionText?.includes(markdownInlineMarker(assetId)) ?? false) ||
    (question.answerText?.includes(markdownInlineMarker(assetId)) ?? false) ||
    (question.questionHtml?.includes(`data-exam-asset-id="${assetId}"`) ?? false) ||
    (question.answerHtml?.includes(`data-exam-asset-id="${assetId}"`) ?? false)
  );
}

function withoutInlineMarker(question: EditableQuestion, assetId: string) {
  const markdownMarker = markdownInlineMarker(assetId);
  const htmlMarkerPattern = new RegExp(
    `<(?:div|span)\\b[^>]*data-exam-asset-id=["']${escapeRegExp(assetId)}["'][^>]*>\\s*</(?:div|span)>`,
    "g"
  );

  return {
    ...question,
    questionText: question.questionText?.replaceAll(markdownMarker, "") ?? null,
    answerText: question.answerText?.replaceAll(markdownMarker, "") ?? null,
    questionHtml: question.questionHtml?.replace(htmlMarkerPattern, "") ?? null,
    answerHtml: question.answerHtml?.replace(htmlMarkerPattern, "") ?? null
  };
}

function withInlineMarker(question: EditableQuestion, asset: EditableAsset) {
  if (asset.placement !== "inline" || hasInlineMarker(question, asset.id)) return question;
  if (asset.role === "question_visual" && question.questionFormat === "markdown") {
    return { ...question, questionText: `${question.questionText ?? ""}\n\n${markdownInlineMarker(asset.id)}\n` };
  }
  if (asset.role === "answer_visual" && question.answerFormat === "markdown") {
    return { ...question, answerText: `${question.answerText ?? ""}\n\n${markdownInlineMarker(asset.id)}\n` };
  }
  if (asset.role === "answer_visual" && question.answerFormat === "html") {
    const answerText = `${question.answerText ?? ""}\n\n${markdownInlineMarker(asset.id)}\n`;
    return { ...question, answerText, answerHtml: markdownToTeacherHtml(answerText) };
  }
  return question;
}

function hasAttachedVisual(question: EditableQuestion) {
  return question.assets.some((asset) => asset.role === "question_visual" || asset.role === "answer_visual");
}

function initialExpandedIds(items: EditableQuestion[]) {
  const needsAttention =
    items.find(
      (question) =>
        question.reviewWarning || (question.requiresVisual && !question.visualNotNeeded && !hasAttachedVisual(question))
    ) ?? items[0];

  return needsAttention ? [needsAttention.id] : [];
}

function visualStatusFor(question: EditableQuestion) {
  if (!question.requiresVisual) return null;
  if (question.visualNotNeeded) return { label: "Visual waived", variant: "neutral" as const };
  if (hasAttachedVisual(question)) return { label: "Visual attached", variant: "success" as const };
  return { label: "Visual required", variant: "warning" as const };
}

export function ExamReviewEditor({
  examId,
  intakeMode,
  examTitle,
  examDescription,
  questions,
  assets,
  published,
  hasSourcePdf = false
}: {
  examId: string;
  intakeMode: ExamIntakeMode;
  examTitle: string;
  examDescription: string | null;
  questions: ExamQuestion[];
  assets: ExamAsset[];
  published: boolean;
  hasSourcePdf?: boolean;
}) {
  const router = useRouter();
  const initialItems = React.useMemo(() => questions.map((question) => toEditable(question, assets)), [questions, assets]);
  const [items, setItems] = useState(initialItems);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState(() => new Set(initialExpandedIds(initialItems)));
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visualOptions, setVisualOptions] = useState<Record<string, VisualUploadOptions>>({});
  const [visualPanelQuestionId, setVisualPanelQuestionId] = useState<string | null>(null);
  const [sourcePdfOpen, setSourcePdfOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);

  const normalizeOrder = (questionsToOrder: EditableQuestion[]) =>
    questionsToOrder.map((question, index) => ({ ...question, sortOrder: index + 1 }));

  const visualOptionFor = (questionId: string): VisualUploadOptions =>
    visualOptions[questionId] ?? { role: "question_visual", placement: "after_content" };

  const updateVisualOption = (questionId: string, patch: Partial<VisualUploadOptions>) => {
    setVisualOptions((current) => ({
      ...current,
      [questionId]: { ...(current[questionId] ?? { role: "question_visual", placement: "after_content" }), ...patch }
    }));
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const expandQuestion = (questionId: string) => {
    setExpandedQuestionIds((current) => new Set(current).add(questionId));
  };

  const deletePendingQuestion = () => {
    if (!pendingDelete) return;
    const deletedId = pendingDelete.id;
    setItems((current) => normalizeOrder(current.filter((question) => question.id !== deletedId)));
    setExpandedQuestionIds((current) => {
      const next = new Set(current);
      next.delete(deletedId);
      return next;
    });
    setVisualPanelQuestionId((current) => (current === deletedId ? null : current));
    setPendingDelete(null);
  };

  const addQuestion = () => {
    const question = newQuestion(intakeMode, items.length + 1);
    setItems((current) => [...current, question]);
    expandQuestion(question.id);
  };

  const update = <K extends keyof EditableQuestion>(index: number, key: K, value: EditableQuestion[K]) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  const updateTeacherAnswerMarkdown = (index: number, value: string) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, answerText: value, answerHtml: markdownToTeacherHtml(value) } : item
      )
    );
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

  const addAssets = (questionIndex: number, uploaded: ExamAsset[], placement: ExamAssetPlacement = "after_content") => {
    setItems((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;
        const nextAssets = [
          ...question.assets,
          ...uploaded.map((asset, offset) => ({
            id: asset.id,
            role: asset.role as EditableAsset["role"],
            sortOrder: question.assets.length + offset,
            placement,
            altText: asset.alt_text
          }))
        ];
        return nextAssets.reduce(withInlineMarker, { ...question, assets: nextAssets });
      })
    );
  };

  const updateAsset = (questionIndex: number, assetIndex: number, patch: Partial<EditableAsset>) => {
    setItems((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;
        const previousAsset = question.assets[assetIndex];
        const assets = question.assets.map((asset, indexOfAsset) =>
          indexOfAsset === assetIndex ? { ...asset, ...patch } : asset
        );
        const updatedAsset = assets[assetIndex];
        const changedInlineTarget =
          previousAsset &&
          previousAsset.placement === "inline" &&
          updatedAsset &&
          (updatedAsset.placement !== "inline" || updatedAsset.role !== previousAsset.role);
        const nextQuestion = changedInlineTarget
          ? withoutInlineMarker({ ...question, assets }, previousAsset.id)
          : { ...question, assets };
        return updatedAsset ? withInlineMarker(nextQuestion, updatedAsset) : nextQuestion;
      })
    );
  };

  const removeAsset = (questionIndex: number, assetIndex: number) => {
    setItems((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;
        const removed = question.assets[assetIndex];
        const assets = question.assets
          .filter((_, indexOfAsset) => indexOfAsset !== assetIndex)
          .map((item, order) => ({ ...item, sortOrder: order }));
        return removed ? withoutInlineMarker({ ...question, assets }, removed.id) : { ...question, assets };
      })
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
    const questionsForSave = items.map((question) =>
      question.answerFormat === "html" && question.answerText !== null
        ? { ...question, answerHtml: markdownToTeacherHtml(question.answerText) }
        : question
    );
    const response = await fetch(`/api/admin/exams/${examId}/${publish ? "publish" : "questions"}`, {
      method: publish ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: questionsForSave })
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-2">
        <p className="px-2 text-sm text-muted-foreground">Preview uses current unsaved edits.</p>
        <div className="flex flex-wrap items-center gap-2">
          {hasSourcePdf ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setSourcePdfOpen(true)}>
              <IconFileTypePdf className="size-3.5" />
              Source PDF
            </Button>
          ) : null}
          <div className="flex gap-1 rounded-md bg-muted p-1" role="group" aria-label="Exam review view">
            <Button type="button" size="sm" variant={view === "edit" ? "default" : "secondary"} onClick={() => setView("edit")}>
              Edit questions
            </Button>
            <Button type="button" size="sm" variant={view === "preview" ? "default" : "secondary"} onClick={() => setView("preview")}>
              Student preview
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={sourcePdfOpen} onOpenChange={setSourcePdfOpen}>
        <DialogContent className="h-[88vh] grid-rows-[auto_minmax(0,1fr)] sm:max-w-[min(96vw,1100px)]">
          <DialogHeader className="pr-8">
            <DialogTitle>Staff-only source PDF</DialogTitle>
            <DialogDescription>Use this as a reference while reviewing the extracted questions.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0">
            <iframe
              src={`/api/admin/exams/${examId}/source`}
              title={`${examTitle} source PDF`}
              className="h-full w-full rounded-md border bg-muted"
            />
          </div>
        </DialogContent>
      </Dialog>

      {view === "edit" ? (
        <>
          {items.map((question, index) => {
            const currentVisualOption = visualOptionFor(question.id);
            const isExpanded = expandedQuestionIds.has(question.id);
            const isVisualPanelOpen = visualPanelQuestionId === question.id;
            const visualStatus = visualStatusFor(question);
            const assetCount = question.assets.length;
            const questionLabel = question.questionNumber || String(index + 1);

            return (
            <section key={question.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-left text-sm font-semibold"
                  aria-expanded={isExpanded}
                  aria-controls={`question-${question.id}-panel`}
                  onClick={() => toggleQuestion(question.id)}
                >
                  {isExpanded ? <IconChevronDown className="size-4 shrink-0" /> : <IconChevronRight className="size-4 shrink-0" />}
                  <span className="truncate">Question {questionLabel}</span>
                </button>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {visualStatus ? <Badge variant={visualStatus.variant}>{visualStatus.label}</Badge> : null}
                  {question.reviewWarning ? <Badge variant="warning">Review warning</Badge> : null}
                  {assetCount > 0 ? (
                    <Badge variant="info">
                      {assetCount} asset{assetCount === 1 ? "" : "s"}
                    </Badge>
                  ) : null}
                  {!published ? (
                    <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Move question ${questionLabel} up`}
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, -1)}
                    >
                      <IconArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Move question ${questionLabel} down`}
                      disabled={index === items.length - 1}
                      onClick={() => moveQuestion(index, 1)}
                    >
                      <IconArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      aria-label={`Delete question ${questionLabel}`}
                      onClick={() => setPendingDelete({ id: question.id, label: questionLabel })}
                    >
                      <IconTrash className="size-3.5" />
                    </Button>
                  </div>
                  ) : null}
                </div>
              </div>

              {isExpanded ? (
              <div id={`question-${question.id}-panel`} className="grid gap-3 p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_120px_140px]">
                  <label className="grid gap-1.5 text-sm font-medium">
                    Question number
                    <Input value={question.questionNumber} onChange={(event) => update(index, "questionNumber", event.target.value)} disabled={published || busy} />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Marks
                    <Input
                      type="number"
                      min={0}
                      value={question.marks ?? ""}
                      onChange={(event) => update(index, "marks", event.target.value === "" ? null : Number(event.target.value))}
                      disabled={published || busy}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Source pages
                    <Input
                      className="font-mono text-sm"
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
                  <MarkdownLatexEditor
                    label="Question Markdown"
                    name={`questions.${index}.questionText`}
                    value={question.questionText ?? ""}
                    onValueChange={(value) => update(index, "questionText", value)}
                    textareaClassName="min-h-28"
                    disabled={published || busy}
                  />
                ) : null}
                {question.answerFormat === "markdown" ? (
                  <MarkdownLatexEditor
                    label="Worked answer Markdown"
                    name={`questions.${index}.answerText`}
                    value={question.answerText ?? ""}
                    onValueChange={(value) => update(index, "answerText", value)}
                    textareaClassName="min-h-48"
                    disabled={published || busy}
                  />
                ) : null}
                {question.answerFormat === "html" ? (
                  <MarkdownLatexEditor
                    label="Worked answer Markdown"
                    name={`questions.${index}.answerText`}
                    value={question.answerText ?? ""}
                    onValueChange={(value) => updateTeacherAnswerMarkdown(index, value)}
                    textareaClassName="min-h-48"
                    disabled={published || busy}
                  />
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

                {!published && intakeMode !== "handwritten_images" ? (
                  <div className="rounded-md border border-dashed border-border bg-muted/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">Visual asset</p>
                        <p className="text-xs text-muted-foreground">Attach a custom upload or source-PDF crop to the question or answer.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isVisualPanelOpen ? "secondary" : "outline"}
                        onClick={() => setVisualPanelQuestionId(isVisualPanelOpen ? null : question.id)}
                      >
                        <IconPhotoPlus className="size-3.5" />
                        {isVisualPanelOpen ? "Close visual tools" : "Add visual"}
                      </Button>
                    </div>
                    {isVisualPanelOpen ? (
                      <div className="mt-3 grid gap-3 border-t border-border pt-3">
                        <div className="grid gap-2 sm:grid-cols-[180px_180px]">
                          <label className="grid gap-1 text-xs font-medium">
                            Attach to
                            <select
                              className="h-8 rounded-sm border bg-background px-2 text-sm"
                              value={currentVisualOption.role}
                              disabled={busy}
                              onChange={(event) =>
                                updateVisualOption(question.id, { role: event.target.value as VisualUploadOptions["role"] })
                              }
                            >
                              <option value="question_visual">Question content</option>
                              <option value="answer_visual">Answer content</option>
                            </select>
                          </label>
                          <label className="grid gap-1 text-xs font-medium">
                            Placement
                            <select
                              className="h-8 rounded-sm border bg-background px-2 text-sm"
                              value={currentVisualOption.placement}
                              disabled={busy}
                              onChange={(event) =>
                                updateVisualOption(question.id, { placement: event.target.value as ExamAssetPlacement })
                              }
                            >
                              <option value="before_content">Before content</option>
                              <option value="after_content">After content</option>
                              <option value="inline">Inline marker</option>
                            </select>
                          </label>
                        </div>
                        <ExamAssetUploader
                          examId={examId}
                          role={currentVisualOption.role}
                          label="Upload visual"
                          surface={false}
                          onUploaded={(uploaded) => addAssets(index, uploaded, currentVisualOption.placement)}
                        />
                        {hasSourcePdf ? (
                          <details>
                            <summary className="cursor-pointer text-sm font-medium">Crop from source PDF</summary>
                            <div className="mt-3">
                              <PdfCropTool
                                examId={examId}
                                role={currentVisualOption.role}
                                onRoleChange={(role) => updateVisualOption(question.id, { role })}
                                showRoleSelect={false}
                                onUploaded={(asset) => addAssets(index, [asset], currentVisualOption.placement)}
                              />
                            </div>
                          </details>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {question.assets.length > 0 ? (
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Attached images and visuals</p>
                    {question.assets.map((asset, assetIndex) => (
                      <div key={asset.id} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[100px_150px_150px_1fr_auto]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/exams/${examId}/assets/${asset.id}`}
                          alt={asset.altText ?? asset.role}
                          className="h-20 w-24 rounded border object-contain"
                        />
                        <select
                          className="rounded-sm border bg-background px-2 text-sm"
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
                        <select
                          className="rounded-sm border bg-background px-2 text-sm"
                          value={asset.placement}
                          disabled={published}
                          onChange={(event) => updateAsset(index, assetIndex, { placement: event.target.value as ExamAssetPlacement })}
                        >
                          <option value="before_content">Before content</option>
                          <option value="after_content">After content</option>
                          {intakeMode !== "handwritten_images" ? <option value="inline">Inline marker</option> : null}
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
                              <IconArrowUp className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Move ${asset.altText ?? asset.role} down`}
                              onClick={() => moveAsset(index, assetIndex, 1)}
                            >
                              <IconArrowDown className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Remove ${asset.altText ?? asset.role}`}
                              onClick={() => removeAsset(index, assetIndex)}
                            >
                              <IconX className="size-3.5" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-3">
                  <div className="grid gap-1">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={question.requiresVisual}
                        disabled={published}
                        onChange={(event) => update(index, "requiresVisual", event.target.checked)}
                      />
                      Needs separate visual asset before publishing
                    </label>
                    <p className="pl-6 text-xs text-muted-foreground">
                      Use when the question text is incomplete without a graph, diagram, table or image.
                    </p>
                  </div>
                  {question.requiresVisual ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={question.visualNotNeeded}
                        disabled={published}
                        onChange={(event) => update(index, "visualNotNeeded", event.target.checked)}
                      />
                      Reviewed: no separate visual asset is needed
                    </label>
                  ) : null}
                </div>

                <label className="grid gap-1.5 text-sm font-medium">
                  Review warning
                  <Textarea
                    value={question.reviewWarning ?? ""}
                    onChange={(event) => update(index, "reviewWarning", event.target.value.trim() ? event.target.value : null)}
                    className="min-h-20"
                    placeholder="Leave blank after resolving every issue."
                    disabled={published || busy}
                  />
                </label>

              </div>
              ) : null}
            </section>
            );
          })}
          {!published ? (
            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
            >
              <IconPlus className="size-4" />
              Add question
            </Button>
          ) : null}
        </>
      ) : (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-border pb-5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-primary">Student preview</p>
            <h1 className="text-[22px] font-semibold tracking-tight">{examTitle}</h1>
            {examDescription ? <p className="mt-1 text-sm text-muted-foreground">{examDescription}</p> : null}
          </div>
          <ProtectedExamViewer watermark="Student Name | student@example.com | Preview">
            <ExamQuestionList examId={examId} questions={items.map(previewQuestion)} />
          </ProtectedExamViewer>
        </section>
      )}

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete question {pendingDelete?.label}?</DialogTitle>
            <DialogDescription>
              This removes the draft question and its attached images from the editor. Save the draft to persist the deletion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={deletePendingQuestion}>
              Delete question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!published ? (
        <div className="sticky bottom-3 flex flex-wrap justify-end gap-2 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void submit(false)}>
            Save draft
          </Button>
          <Button type="button" variant="default" disabled={busy} onClick={() => void submit(true)}>
            Approve and publish entire exam
          </Button>
        </div>
      ) : (
        <Alert>This exam is published and read-only. Students can view its reviewed questions, answers and visuals.</Alert>
      )}
    </div>
  );
}
