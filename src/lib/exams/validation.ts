import { z } from "zod";

export const examSourceBucket = "exam-sources";
export const maxExamFileSizeBytes = 50 * 1024 * 1024;

export const examUploadInputSchema = z.object({
  subjectId: z.string().uuid(),
  chapterIds: z.array(z.string().uuid()).min(1).max(50).transform((ids) => [...new Set(ids)]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive().max(maxExamFileSizeBytes)
});

export const examQuestionInputSchema = z.object({
  id: z.string().uuid(),
  questionNumber: z.string().trim().min(1).max(50),
  questionText: z.string().trim().min(1),
  answerText: z.string().trim().min(1),
  marks: z.number().int().min(0).nullable(),
  sourcePages: z.array(z.number().int().positive()).max(100),
  reviewWarning: z.string().trim().max(2000).nullable(),
  sortOrder: z.number().int().min(0)
});

export const examQuestionsInputSchema = z.object({
  questions: z.array(examQuestionInputSchema).min(1).max(200)
});

export function safeExamFileName(fileName: string) {
  const baseName = fileName.split(/[\\/]/).pop() ?? "exam.pdf";
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase();
  return sanitized.toLowerCase().endsWith(".pdf") ? sanitized : `${sanitized}.pdf`;
}
