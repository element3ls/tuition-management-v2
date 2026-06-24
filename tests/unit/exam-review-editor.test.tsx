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

const teacherHtmlQuestion: ExamQuestion = {
  ...question,
  id: "question-html-1",
  answer_text: null,
  answer_html: '<p>Answer <span data-math="x=2"></span>.</p><div data-math-display="\\boxed{x=2}"></div>',
  answer_format: "html"
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

  it("converts teacher HTML answers into editable Markdown with preview", () => {
    render(
      <ExamReviewEditor
        examId="exam-1"
        intakeMode="teacher_html"
        examTitle="Algebra Exam"
        examDescription={null}
        questions={[teacherHtmlQuestion]}
        assets={[]}
        published={false}
      />
    );

    expect(screen.queryByLabelText("Teacher answer HTML")).not.toBeInTheDocument();

    const answerTextarea = screen.getByLabelText("Worked answer Markdown") as HTMLTextAreaElement;
    expect(answerTextarea.value).toContain("Answer $x=2$.");
    expect(answerTextarea.value).toContain("$$");
    expect(answerTextarea.value).toContain("\\boxed{x=2}");

    fireEvent.change(answerTextarea, { target: { value: "Updated answer\n\n$$\n\\boxed{x=5}\n$$" } });
    fireEvent.click(screen.getByRole("button", { name: "Student preview" }));

    expect(screen.getByText(/Updated answer/)).toBeInTheDocument();
    expect(document.querySelector(".katex")).not.toBeNull();
  });

  it("asks for confirmation before removing draft questions", () => {
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
    expect(screen.getByText("Delete question 2?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Delete question 2?")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Question number")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Delete question 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete question" }));
    expect(screen.getAllByLabelText("Question number")).toHaveLength(1);
  });

  it("keeps visual upload tools collapsed until requested", () => {
    render(
      <ExamReviewEditor
        examId="exam-1"
        intakeMode="ai_solved"
        examTitle="Algebra Exam"
        examDescription={null}
        questions={[question]}
        assets={[]}
        published={false}
        hasSourcePdf
      />
    );

    expect(screen.queryByText("Upload visual")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add visual" }));

    expect(screen.getByText("Upload visual")).toBeInTheDocument();
    expect(screen.getByText("Crop from source PDF")).toBeInTheDocument();
  });
});
