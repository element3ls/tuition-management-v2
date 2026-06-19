import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("uses the rich Markdown toolbar for exam questions and answers", () => {
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

    const questionTextarea = screen.getByLabelText("Question Markdown") as HTMLTextAreaElement;
    const questionEditor = questionTextarea.parentElement?.parentElement;
    expect(questionEditor).not.toBeNull();

    questionTextarea.focus();
    questionTextarea.setSelectionRange("Original ".length, "Original question".length);
    fireEvent.click(within(questionEditor!).getByRole("button", { name: "Inline equation" }));
    expect(questionTextarea).toHaveValue("Original $question$");

    const answerTextarea = screen.getByLabelText("Worked answer Markdown") as HTMLTextAreaElement;
    const answerEditor = answerTextarea.parentElement?.parentElement;
    expect(answerEditor).not.toBeNull();
    answerTextarea.focus();
    answerTextarea.setSelectionRange(answerTextarea.value.length, answerTextarea.value.length);
    fireEvent.click(within(answerEditor!).getByRole("button", { name: "Pi" }));
    expect(answerTextarea).toHaveValue("Original answer$\\pi$");

    fireEvent.click(screen.getByRole("button", { name: "Student preview" }));

    expect(document.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
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
