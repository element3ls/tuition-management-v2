import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExamQuestionList } from "@/components/content/exam-question-list";

describe("exam student renderer", () => {
  it("renders Markdown, controlled HTML, math, and ordered protected images", () => {
    render(
      <ExamQuestionList
        examId="exam-1"
        questions={[
          {
            id: "question-1",
            questionNumber: "1",
            questionText: "Find **x**.",
            answerText: null,
            questionHtml: null,
            answerHtml: '<p>Answer <span data-math="x=2"></span></p>',
            questionFormat: "markdown",
            answerFormat: "html",
            marks: 2,
            assets: [
              {
                id: "visual-1",
                role: "question_visual",
                sortOrder: 0,
                altText: "Coordinate graph"
              },
              {
                id: "answer-1",
                role: "answer_image",
                sortOrder: 1,
                altText: "Handwritten answer"
              }
            ]
          }
        ]}
      />
    );

    expect(screen.getByText("x", { selector: "strong" })).toBeInTheDocument();
    expect(document.querySelector(".katex")).not.toBeNull();
    expect(screen.getByAltText("Coordinate graph")).toHaveAttribute("src", "/api/exams/exam-1/assets/visual-1");
    expect(screen.getByAltText("Handwritten answer")).toHaveAttribute("src", "/api/exams/exam-1/assets/answer-1");
  });
});
