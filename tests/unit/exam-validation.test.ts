import { describe, expect, it } from "vitest";
import {
  examCreateInputSchema,
  examQuestionsInputSchema,
  examUploadInputSchema,
  expectedAssetSignature,
  maxExamFileSizeBytes,
  safeExamFileName
} from "@/lib/exams/validation";

describe("exam intake validation", () => {
  const validUpload = {
    subjectId: "30000000-0000-4000-8000-000000000001",
    chapterIds: ["40000000-0000-4000-8000-000000000001"],
    title: "Practice exam",
    description: null,
    fileName: "paper.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024
  };

  it("accepts a private PDF upload within the configured limit", () => {
    expect(examUploadInputSchema.safeParse(validUpload).success).toBe(true);
  });

  it("rejects non-PDF files and oversized files", () => {
    expect(examUploadInputSchema.safeParse({ ...validUpload, mimeType: "image/png" }).success).toBe(false);
    expect(examUploadInputSchema.safeParse({ ...validUpload, sizeBytes: maxExamFileSizeBytes + 1 }).success).toBe(false);
  });

  it("requires at least one covered chapter", () => {
    expect(examUploadInputSchema.safeParse({ ...validUpload, chapterIds: [] }).success).toBe(false);
  });

  it("sanitizes storage names and validates reviewed questions", () => {
    expect(safeExamFileName("../SPM Paper 1")).toBe("spm-paper-1");
    const reviewedQuestions = examQuestionsInputSchema.safeParse({
        questions: [
          {
            id: "73000000-0000-4000-8000-000000000001",
            questionNumber: "1",
            questionText: "Solve $x + 1 = 2$.",
            answerText: "$x = 1$.",
            questionHtml: null,
            answerHtml: null,
            questionFormat: "markdown",
            answerFormat: "markdown",
            marks: 1,
            sourcePages: [1],
            reviewWarning: null,
            requiresVisual: false,
            visualNotNeeded: false,
            assets: [],
            sortOrder: 1
          }
        ]
      });
    expect(reviewedQuestions.success).toBe(true);
    if (reviewedQuestions.success) {
      expect(reviewedQuestions.data.questions[0].assets).toEqual([]);
    }
  });

  it("enforces the three intake-mode file contracts", () => {
    const common = {
      subjectId: validUpload.subjectId,
      chapterIds: validUpload.chapterIds,
      title: validUpload.title,
      description: null
    };
    const pdf = {
      clientId: "pdf",
      role: "source_pdf",
      fileName: "paper.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024
    };
    const html = {
      clientId: "html",
      role: "answer_html",
      fileName: "answers.html",
      mimeType: "text/html",
      sizeBytes: 1024
    };

    expect(examCreateInputSchema.safeParse({ ...common, intakeMode: "ai_solved", assets: [pdf] }).success).toBe(true);
    expect(examCreateInputSchema.safeParse({ ...common, intakeMode: "teacher_html", assets: [pdf, html] }).success).toBe(
      true
    );
    expect(examCreateInputSchema.safeParse({ ...common, intakeMode: "teacher_html", assets: [pdf] }).success).toBe(
      false
    );
    expect(
      examCreateInputSchema.safeParse({ ...common, intakeMode: "handwritten_images", assets: [] }).success
    ).toBe(true);
  });

  it("rejects spoofed signatures and crop regions outside a PDF page", () => {
    expect(expectedAssetSignature("application/pdf", new TextEncoder().encode("<html></html>"))).toBe(false);
    expect(expectedAssetSignature("text/html", new TextEncoder().encode("<section></section>"))).toBe(true);

    const result = examCreateInputSchema.safeParse({
      intakeMode: "handwritten_images",
      subjectId: validUpload.subjectId,
      chapterIds: validUpload.chapterIds,
      title: validUpload.title,
      assets: [
        {
          clientId: "image",
          role: "question_image",
          fileName: "question.webp",
          mimeType: "image/webp",
          sizeBytes: 100,
          crop: { x: 0.8, y: 0, width: 0.3, height: 1 }
        }
      ]
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate question numbers and duplicate asset attachments", () => {
    const baseQuestion = {
      id: "73000000-0000-4000-8000-000000000001",
      questionNumber: "1",
      questionText: null,
      answerText: null,
      questionHtml: null,
      answerHtml: null,
      questionFormat: "image",
      answerFormat: "image",
      marks: null,
      sourcePages: [],
      reviewWarning: null,
      requiresVisual: false,
      visualNotNeeded: false,
      sortOrder: 1,
      assets: [
        {
          id: "74000000-0000-4000-8000-000000000001",
          role: "question_image",
          sortOrder: 0,
          altText: null
        }
      ]
    };
    expect(
      examQuestionsInputSchema.safeParse({
        questions: [
          baseQuestion,
          { ...baseQuestion, id: "73000000-0000-4000-8000-000000000002", sortOrder: 2 }
        ]
      }).success
    ).toBe(false);
  });

  it("defaults reviewed asset placement to after content", () => {
    const result = examQuestionsInputSchema.safeParse({
      questions: [
        {
          id: "73000000-0000-4000-8000-000000000001",
          questionNumber: "1",
          questionText: "Use the diagram.",
          answerText: "Answer.",
          questionHtml: null,
          answerHtml: null,
          questionFormat: "markdown",
          answerFormat: "markdown",
          marks: 1,
          sourcePages: [1],
          reviewWarning: null,
          requiresVisual: true,
          visualNotNeeded: false,
          sortOrder: 1,
          assets: [
            {
              id: "74000000-0000-4000-8000-000000000001",
              role: "question_visual",
              sortOrder: 0,
              altText: null
            }
          ]
        }
      ]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.questions[0].assets[0].placement).toBe("after_content");
    }
  });
});
