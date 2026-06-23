import React from "react";
import { RichText } from "@/components/content/rich-text";
import { SafeHtml } from "@/components/content/safe-html";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExamAssetPlacement, ExamAssetRole, ExamContentFormat } from "@/types/domain";

export type ExamQuestionAssetContent = {
  id: string;
  role: Extract<ExamAssetRole, "question_image" | "answer_image" | "question_visual" | "answer_visual">;
  sortOrder: number;
  placement?: ExamAssetPlacement;
  altText: string | null;
};

export type ExamQuestionContent = {
  id: string;
  questionNumber: string;
  questionText: string | null;
  answerText: string | null;
  questionHtml: string | null;
  answerHtml: string | null;
  questionFormat: ExamContentFormat;
  answerFormat: ExamContentFormat;
  marks: number | null;
  assets: ExamQuestionAssetContent[];
};

const inlineAssetMarker = /\{\{\s*exam_asset:([a-zA-Z0-9_-]+)\s*\}\}/g;

function sortAssets(assets: ExamQuestionAssetContent[]) {
  return [...assets].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function AssetFigure({ examId, asset }: { examId: string; asset: ExamQuestionAssetContent }) {
  return (
    <figure className="overflow-hidden rounded-lg border bg-muted/20 p-2">
      {/* Protected route checks exam publication and the current student's access. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/exams/${examId}/assets/${asset.id}`}
        alt={asset.altText ?? "Exam visual"}
        draggable={false}
        className="mx-auto h-auto max-h-[70vh] max-w-full rounded object-contain"
      />
      {asset.altText ? <figcaption className="mt-2 text-xs text-muted-foreground">{asset.altText}</figcaption> : null}
    </figure>
  );
}

function AssetGallery({ examId, assets }: { examId: string; assets: ExamQuestionAssetContent[] }) {
  const visible = sortAssets(assets);
  if (visible.length === 0) return null;
  return (
    <div className="grid gap-3">
      {visible.map((asset) => (
        <AssetFigure key={asset.id} examId={examId} asset={asset} />
      ))}
    </div>
  );
}

function collectInlineAssetIds(value: string | null, format: ExamContentFormat, inlineAssets: ExamQuestionAssetContent[]) {
  const allowed = new Set(inlineAssets.map((asset) => asset.id));
  const used = new Set<string>();
  if (!value) return used;

  if (format === "html") {
    const htmlMarker = /data-exam-asset-id=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = htmlMarker.exec(value))) {
      if (allowed.has(match[1])) used.add(match[1]);
    }
    return used;
  }

  inlineAssetMarker.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = inlineAssetMarker.exec(value))) {
    if (allowed.has(match[1])) used.add(match[1]);
  }
  return used;
}

function MarkdownWithInlineAssets({
  examId,
  markdown,
  inlineAssets
}: {
  examId: string;
  markdown: string;
  inlineAssets: ExamQuestionAssetContent[];
}) {
  const assetsById = new Map(inlineAssets.map((asset) => [asset.id, asset]));
  const content: React.ReactNode[] = [];
  let lastIndex = 0;
  inlineAssetMarker.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = inlineAssetMarker.exec(markdown))) {
    const text = markdown.slice(lastIndex, match.index);
    if (text.trim()) content.push(<RichText key={`text-${lastIndex}`}>{text}</RichText>);

    const asset = assetsById.get(match[1]);
    if (asset) {
      content.push(<AssetFigure key={`asset-${asset.id}`} examId={examId} asset={asset} />);
    } else {
      content.push(<RichText key={`missing-${match.index}`}>{match[0]}</RichText>);
    }
    lastIndex = inlineAssetMarker.lastIndex;
  }

  const remaining = markdown.slice(lastIndex);
  if (remaining.trim()) content.push(<RichText key={`text-${lastIndex}`}>{remaining}</RichText>);
  if (content.length === 0) return null;
  return <div className="grid gap-3">{content}</div>;
}

function ContentBlock({
  examId,
  format,
  markdown,
  html,
  inlineAssets
}: {
  examId: string;
  format: ExamContentFormat;
  markdown: string | null;
  html: string | null;
  inlineAssets: ExamQuestionAssetContent[];
}) {
  if (format === "markdown" && markdown) {
    return <MarkdownWithInlineAssets examId={examId} markdown={markdown} inlineAssets={inlineAssets} />;
  }
  if (format === "html" && html) return <SafeHtml html={html} examId={examId} inlineAssets={inlineAssets} />;
  return null;
}

function ContentArea({
  examId,
  assets,
  format,
  markdown,
  html
}: {
  examId: string;
  assets: ExamQuestionAssetContent[];
  format: ExamContentFormat;
  markdown: string | null;
  html: string | null;
}) {
  const beforeAssets = assets.filter((asset) => (asset.placement ?? "after_content") === "before_content");
  const inlineAssets = assets.filter((asset) => asset.placement === "inline");
  const usedInlineIds = collectInlineAssetIds(format === "html" ? html : markdown, format, inlineAssets);
  const afterAssets = [
    ...assets.filter((asset) => (asset.placement ?? "after_content") === "after_content"),
    ...inlineAssets.filter((asset) => !usedInlineIds.has(asset.id))
  ];

  return (
    <>
      <AssetGallery examId={examId} assets={beforeAssets} />
      <ContentBlock examId={examId} format={format} markdown={markdown} html={html} inlineAssets={inlineAssets} />
      <AssetGallery examId={examId} assets={afterAssets} />
    </>
  );
}

export function ExamQuestionList({ examId, questions }: { examId: string; questions: ExamQuestionContent[] }) {
  return (
    <div className="grid gap-5">
      {questions.map((question) => {
        const questionAssets = question.assets.filter((asset) => ["question_image", "question_visual"].includes(asset.role));
        const answerAssets = question.assets.filter((asset) => ["answer_image", "answer_visual"].includes(asset.role));

        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle>
                Question {question.questionNumber}
                {question.marks !== null ? ` - ${question.marks} marks` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <ContentArea
                examId={examId}
                assets={questionAssets}
                format={question.questionFormat}
                markdown={question.questionText}
                html={question.questionHtml}
              />
              <section className="grid gap-4 rounded-lg bg-secondary/30 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Worked answer</h2>
                <ContentArea
                  examId={examId}
                  assets={answerAssets}
                  format={question.answerFormat}
                  markdown={question.answerText}
                  html={question.answerHtml}
                />
              </section>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
