import { describe, expect, it } from "vitest";
import {
  examQuestionsInputSchema,
  examUploadInputSchema,
  maxExamFileSizeBytes,
  safeExamFileName
} from "@/lib/exams/validation";

describe("exam intake validation", () => {
  const validUpload = {
    chapterId: "40000000-0000-4000-8000-000000000001",
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

  it("sanitizes storage names and validates reviewed questions", () => {
    expect(safeExamFileName("../SPM Paper 1")).toBe("spm-paper-1.pdf");
    expect(
      examQuestionsInputSchema.safeParse({
        questions: [
          {
            id: "73000000-0000-4000-8000-000000000001",
            questionNumber: "1",
            questionText: "Solve $x + 1 = 2$.",
            answerText: "$x = 1$.",
            marks: 1,
            sourcePages: [1],
            reviewWarning: null,
            sortOrder: 1
          }
        ]
      }).success
    ).toBe(true);
  });
});
