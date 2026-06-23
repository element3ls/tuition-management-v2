import { z } from "zod";

export const examSourceBucket = "exam-sources";
export const examAssetBucket = "exam-assets";
export const maxExamPdfSizeBytes = 50 * 1024 * 1024;
export const maxExamHtmlSizeBytes = 5 * 1024 * 1024;
export const maxExamImageSizeBytes = 15 * 1024 * 1024;
export const maxExamImageCount = 100;
export const maxExamCombinedAssetBytes = 150 * 1024 * 1024;

export const examIntakeModeSchema = z.enum(["ai_solved", "teacher_html", "handwritten_images"]);
export const examAssetPlacementSchema = z.enum(["before_content", "after_content", "inline"]);
export const examAssetRoleSchema = z.enum([
  "source_pdf",
  "answer_html",
  "html_image",
  "question_image",
  "answer_image",
  "question_visual",
  "answer_visual"
]);

const pdfAssetSchema = z.object({
  clientId: z.string().min(1).max(100),
  role: z.literal("source_pdf"),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive().max(maxExamPdfSizeBytes)
});

const htmlAssetSchema = z.object({
  clientId: z.string().min(1).max(100),
  role: z.literal("answer_html"),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["text/html", "application/xhtml+xml"]),
  sizeBytes: z.number().int().positive().max(maxExamHtmlSizeBytes)
});

const imageAssetSchema = z.object({
  clientId: z.string().min(1).max(100),
  role: z.enum(["html_image", "question_image", "answer_image", "question_visual", "answer_visual"]),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  sizeBytes: z.number().int().positive().max(maxExamImageSizeBytes),
  sourcePage: z.number().int().positive().nullable().optional(),
  crop: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      width: z.number().positive().max(1),
      height: z.number().positive().max(1)
    })
    .refine((crop) => crop.x + crop.width <= 1 && crop.y + crop.height <= 1, {
      message: "Crop coordinates must remain inside the source page."
    })
    .nullable()
    .optional(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
  altText: z.string().trim().max(500).nullable().optional()
});

export const examAssetUploadInputSchema = z.discriminatedUnion("role", [
  pdfAssetSchema.omit({ clientId: true }),
  htmlAssetSchema.omit({ clientId: true }),
  imageAssetSchema.omit({ clientId: true })
]);

export const examCreateInputSchema = z
  .object({
    intakeMode: examIntakeModeSchema,
    subjectId: z.string().uuid(),
    chapterIds: z.array(z.string().uuid()).min(1).max(50).transform((ids) => [...new Set(ids)]),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    assets: z.array(z.discriminatedUnion("role", [pdfAssetSchema, htmlAssetSchema, imageAssetSchema])).max(maxExamImageCount + 2)
  })
  .superRefine((input, context) => {
    const sourceCount = input.assets.filter((asset) => asset.role === "source_pdf").length;
    const htmlCount = input.assets.filter((asset) => asset.role === "answer_html").length;
    const htmlImageNames = input.assets
      .filter((asset) => asset.role === "html_image")
      .map((asset) => asset.fileName.toLowerCase());
    const imageCount = input.assets.filter((asset) => asset.mimeType.startsWith("image/")).length;
    const totalBytes = input.assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);

    if (totalBytes > maxExamCombinedAssetBytes) {
      context.addIssue({ code: "custom", message: "Exam assets exceed the 150 MB combined limit.", path: ["assets"] });
    }
    if (imageCount > maxExamImageCount) {
      context.addIssue({ code: "custom", message: "An exam can contain at most 100 images.", path: ["assets"] });
    }
    if (new Set(htmlImageNames).size !== htmlImageNames.length) {
      context.addIssue({ code: "custom", message: "HTML image filenames must be unique.", path: ["assets"] });
    }
    if (input.intakeMode === "ai_solved" && (sourceCount !== 1 || htmlCount !== 0)) {
      context.addIssue({ code: "custom", message: "AI-solved exams require exactly one source PDF.", path: ["assets"] });
    }
    if (input.intakeMode === "teacher_html" && (sourceCount !== 1 || htmlCount !== 1)) {
      context.addIssue({
        code: "custom",
        message: "Teacher HTML exams require exactly one source PDF and one answer HTML file.",
        path: ["assets"]
      });
    }
    if (input.intakeMode === "handwritten_images" && (sourceCount !== 0 || htmlCount !== 0)) {
      context.addIssue({ code: "custom", message: "Handwritten exams use question and answer images.", path: ["assets"] });
    }
  });

// Compatibility export for callers and tests that still refer to the original PDF-only schema.
export const examUploadInputSchema = z.object({
  subjectId: z.string().uuid(),
  chapterIds: z.array(z.string().uuid()).min(1).max(50).transform((ids) => [...new Set(ids)]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive().max(maxExamPdfSizeBytes)
});

export const examQuestionAssetInputSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["question_image", "answer_image", "question_visual", "answer_visual"]),
  sortOrder: z.number().int().min(0),
  placement: examAssetPlacementSchema.default("after_content"),
  altText: z.string().trim().max(500).nullable()
});

export const examQuestionInputSchema = z
  .object({
    id: z.string().uuid(),
    questionNumber: z.string().trim().min(1).max(50),
    questionText: z.string().trim().nullable(),
    answerText: z.string().trim().nullable(),
    questionHtml: z.string().trim().nullable(),
    answerHtml: z.string().trim().nullable(),
    questionFormat: z.enum(["markdown", "html", "image"]),
    answerFormat: z.enum(["markdown", "html", "image"]),
    marks: z.number().int().min(0).nullable(),
    sourcePages: z.array(z.number().int().positive()).max(100),
    reviewWarning: z.string().trim().max(2000).nullable(),
    requiresVisual: z.boolean(),
    visualNotNeeded: z.boolean(),
    sortOrder: z.number().int().min(0),
    assets: z.array(examQuestionAssetInputSchema).max(maxExamImageCount)
  })
  .superRefine((question, context) => {
    if (question.questionFormat === "markdown" && !question.questionText) {
      context.addIssue({ code: "custom", message: "Question Markdown is required.", path: ["questionText"] });
    }
    if (question.answerFormat === "markdown" && !question.answerText) {
      context.addIssue({ code: "custom", message: "Answer Markdown is required.", path: ["answerText"] });
    }
    if (question.questionFormat === "html" && !question.questionHtml) {
      context.addIssue({ code: "custom", message: "Question HTML is required.", path: ["questionHtml"] });
    }
    if (question.answerFormat === "html" && !question.answerHtml) {
      context.addIssue({ code: "custom", message: "Answer HTML is required.", path: ["answerHtml"] });
    }
  });

export const examQuestionsInputSchema = z
  .object({
    questions: z.array(examQuestionInputSchema).min(1).max(200)
  })
  .superRefine((input, context) => {
    const questionIds = new Set<string>();
    const questionNumbers = new Set<string>();
    const assetIds = new Set<string>();

    input.questions.forEach((question, questionIndex) => {
      if (questionIds.has(question.id)) {
        context.addIssue({ code: "custom", message: "Question IDs must be unique.", path: ["questions", questionIndex, "id"] });
      }
      if (questionNumbers.has(question.questionNumber)) {
        context.addIssue({
          code: "custom",
          message: `Question number ${question.questionNumber} is duplicated.`,
          path: ["questions", questionIndex, "questionNumber"]
        });
      }
      questionIds.add(question.id);
      questionNumbers.add(question.questionNumber);

      question.assets.forEach((asset, assetIndex) => {
        if (assetIds.has(asset.id)) {
          context.addIssue({
            code: "custom",
            message: "An image or visual can only be attached to one question.",
            path: ["questions", questionIndex, "assets", assetIndex, "id"]
          });
        }
        assetIds.add(asset.id);
      });
    });
  });

export function safeExamFileName(fileName: string, fallbackExtension?: string) {
  const baseName = fileName.split(/[\\/]/).pop() ?? `exam${fallbackExtension ?? ""}`;
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase();
  if (!fallbackExtension || sanitized.endsWith(fallbackExtension)) return sanitized;
  return `${sanitized}${fallbackExtension}`;
}

export function expectedAssetSignature(mimeType: string, bytes: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (mimeType === "application/pdf") return ascii(0, 5) === "%PDF-";
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
    );
  }
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/webp") {
    return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  }
  if (mimeType === "text/html" || mimeType === "application/xhtml+xml") {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return !text.includes("\u0000") && /<(?:!doctype\s+html|html|section)\b/i.test(text);
  }
  return false;
}

export const maxExamFileSizeBytes = maxExamPdfSizeBytes;
