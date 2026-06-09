import React from "react";
import { RichText } from "@/components/content/rich-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ExamQuestionContent = {
  id: string;
  questionNumber: string;
  questionText: string;
  answerText: string;
  marks: number | null;
};

export function ExamQuestionList({ questions }: { questions: ExamQuestionContent[] }) {
  return (
    <div className="grid gap-5">
      {questions.map((question) => (
        <Card key={question.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Question {question.questionNumber}</CardTitle>
              {question.marks !== null ? <Badge variant="outline">{question.marks} marks</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <RichText>{question.questionText}</RichText>
            <section className="rounded-md border border-primary/20 bg-primary/5 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Worked answer</h2>
              <RichText>{question.answerText}</RichText>
            </section>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
