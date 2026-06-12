import React from "react";
import { RichText } from "@/components/content/rich-text";
import { SafeHtml } from "@/components/content/safe-html";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExamAssetRole, ExamContentFormat } from "@/types/domain";

export type ExamQuestionAssetContent = {
  id: string;
  role: Extract<ExamAssetRole, "question_image" | "answer_image" | "question_visual" | "answer_visual">;
  sortOrder: number;
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

function AssetGallery({
  examId,
  assets,
  roles
}: {
  examId: string;
  assets: ExamQuestionAssetContent[];
  roles: ExamQuestionAssetContent["role"][];
}) {
  const visible = assets.filter((asset) => roles.includes(asset.role)).sort((a, b) => a.sortOrder - b.sortOrder);
  if (visible.length === 0) return null;
  return (
    <div className="grid gap-3">
      {visible.map((asset) => (
        <figure key={asset.id} className="overflow-hidden rounded-lg border bg-muted/20 p-2">
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
      ))}
    </div>
  );
}

function ContentBlock({
  format,
  markdown,
  html
}: {
  format: ExamContentFormat;
  markdown: string | null;
  html: string | null;
}) {
  if (format === "markdown" && markdown) return <RichText>{markdown}</RichText>;
  if (format === "html" && html) return <SafeHtml html={html} />;
  return null;
}

export function ExamQuestionList({ examId, questions }: { examId: string; questions: ExamQuestionContent[] }) {
  return (
    <div className="grid gap-5">
      {questions.map((question) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle>
              Question {question.questionNumber}
              {question.marks !== null ? ` · ${question.marks} marks` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <ContentBlock format={question.questionFormat} markdown={question.questionText} html={question.questionHtml} />
            <AssetGallery examId={examId} assets={question.assets} roles={["question_image", "question_visual"]} />
            <section className="grid gap-4 rounded-lg bg-secondary/30 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Worked answer</h2>
              <ContentBlock format={question.answerFormat} markdown={question.answerText} html={question.answerHtml} />
              <AssetGallery examId={examId} assets={question.assets} roles={["answer_image", "answer_visual"]} />
            </section>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
