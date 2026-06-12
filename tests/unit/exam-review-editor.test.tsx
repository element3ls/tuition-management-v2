import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExamReviewEditor } from "@/app/(admin)/admin/exams/exam-review-editor";
import type { ExamQuestion } from "@/types/domain";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

const question: ExamQuestion = {
  id: "question-1",
  exam_id: "exam-1",
  question_number: "1",
  question_text: "Original question",
  answer_text: "Original answer",
  question_html: null,
  answer_html: null,
  question_format: "markdown",
  answer_format: "markdown",
  marks: 5,
  source_pages: [1],
  review_warning: null,
  requires_visual: false,
  visual_not_needed: false,
  sort_order: 1,
  created_at: "2026-06-09T00:00:00.000Z",
  updated_at: "2026-06-09T00:00:00.000Z"
};

describe("exam review editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("React", React);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows current unsaved edits in the student preview", () => {
    render(
      <ExamReviewEditor
        examId="exam-1"
        intakeMode="ai_solved"
        examTitle="Algebra Exam"
        examDescription="Worked solutions"
        questions={[question]}
        assets={[]}
        published={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Question Markdown"), { target: { value: "Updated **question**" } });
    fireEvent.change(screen.getByLabelText("Worked answer Markdown"), {
      target: { value: "Updated answer: $x = 4$" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Student preview" }));

    expect(screen.getByRole("heading", { name: "Algebra Exam" })).toBeInTheDocument();
    expect(screen.getByText("question", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/Updated answer:/)).toBeInTheDocument();
    expect(document.querySelector(".katex")).not.toBeNull();
  });

  it("adds and removes draft questions", () => {
    render(
      <ExamReviewEditor
        examId="exam-1"
        intakeMode="ai_solved"
        examTitle="Algebra Exam"
        examDescription={null}
        questions={[question]}
        assets={[]}
        published={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    expect(screen.getAllByLabelText("Question number")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Delete question 2" }));
    expect(screen.getAllByLabelText("Question number")).toHaveLength(1);
  });
});
