import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExamQuestionList } from "@/components/content/exam-question-list";

describe("exam student renderer", () => {
  it("renders Markdown, controlled HTML, math, and placed protected images", () => {
    render(
      <ExamQuestionList
        examId="exam-1"
        questions={[
          {
            id: "question-1",
            questionNumber: "1",
            questionText: "Find **x**.\n\n{{exam_asset:inline-visual}}\n\nThen justify your answer.",
            answerText: null,
            questionHtml: null,
            answerHtml: '<p>Answer <span data-math="x=2"></span></p><div data-exam-asset-id="answer-inline"></div>',
            questionFormat: "markdown",
            answerFormat: "html",
            marks: 2,
            assets: [
              {
                id: "before-visual",
                role: "question_visual",
                sortOrder: 0,
                placement: "before_content",
                altText: "Before graph"
              },
              {
                id: "inline-visual",
                role: "question_visual",
                sortOrder: 1,
                placement: "inline",
                altText: "Inline graph"
              },
              {
                id: "after-visual",
                role: "question_visual",
                sortOrder: 2,
                placement: "after_content",
                altText: "After graph"
              },
              {
                id: "answer-inline",
                role: "answer_visual",
                sortOrder: 3,
                placement: "inline",
                altText: "Answer diagram"
              }
            ]
          }
        ]}
      />
    );

    expect(screen.getByText("x", { selector: "strong" })).toBeInTheDocument();
    expect(document.querySelector(".katex")).not.toBeNull();
    expect(screen.queryByText(/exam_asset/)).not.toBeInTheDocument();
    expect(screen.getByAltText("Before graph")).toHaveAttribute("src", "/api/exams/exam-1/assets/before-visual");
    expect(screen.getByAltText("Inline graph")).toHaveAttribute("src", "/api/exams/exam-1/assets/inline-visual");
    expect(screen.getByAltText("After graph")).toHaveAttribute("src", "/api/exams/exam-1/assets/after-visual");
    expect(screen.getByAltText("Answer diagram")).toHaveAttribute("src", "/api/exams/exam-1/assets/answer-inline");
  });
});
