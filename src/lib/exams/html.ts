import "server-only";

import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import type { ExamAsset } from "@/types/domain";

const allowedTags = [
  "p",
  "br",
  "h2",
  "h3",
  "h4",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "span",
  "div",
  "sup",
  "sub"
];

export type ImportedHtmlAnswer = {
  questionNumber: string;
  html: string;
};

export function sanitizeExamHtml(value: string, examId: string, imageAssets: ExamAsset[] = []) {
  const readyAssets = imageAssets.filter(
    (asset) => asset.role === "html_image" && asset.variant === "display" && asset.upload_status === "ready"
  );
  const assetsByName = new Map(readyAssets.map((asset) => [asset.file_name.toLowerCase(), asset]));
  const assetsById = new Map(readyAssets.map((asset) => [asset.id, asset]));
  const $ = cheerio.load(value, null, false);

  $("[data-math]").each((_index, element) => {
    const math = ($(element).attr("data-math")?.trim() || $(element).text().trim());
    $(element).attr("data-math", math);
  });
  $("[data-math-display]").each((_index, element) => {
    const math = ($(element).attr("data-math-display")?.trim() || $(element).text().trim());
    $(element).attr("data-math-display", math);
  });
  $("img").each((_index, element) => {
    const source = ($(element).attr("src") ?? "").trim();
    const localMatch = /^assets\/([^/?#]+)$/i.exec(source);
    const protectedMatch = /^\/api\/exams\/([^/]+)\/assets\/([^/?#]+)$/i.exec(source);
    const localAsset = localMatch ? assetsByName.get(localMatch[1].toLowerCase()) : undefined;
    const protectedAsset =
      protectedMatch && protectedMatch[1] === examId ? assetsById.get(protectedMatch[2]) : undefined;

    if (!localAsset && !protectedAsset) {
      throw new Error(
        `HTML image source "${source || "(empty)"}" is not allowed or has not been uploaded. Use assets/filename.ext.`
      );
    }
  });

  return sanitizeHtml($.html(), {
    allowedTags,
    allowedAttributes: {
      img: ["src", "alt", "width", "height"],
      span: ["data-math"],
      div: ["data-math-display"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"]
    },
    allowedSchemes: [],
    allowProtocolRelative: false,
    transformTags: {
      img: (_tagName, attributes) => {
        const source = attributes.src ?? "";
        const localMatch = /^assets\/([^/?#]+)$/i.exec(source);
        const protectedMatch = /^\/api\/exams\/([^/]+)\/assets\/([^/?#]+)$/i.exec(source);
        const asset = localMatch
          ? assetsByName.get(localMatch[1].toLowerCase())
          : protectedMatch && protectedMatch[1] === examId
            ? assetsById.get(protectedMatch[2])
            : undefined;
        if (!asset) return { tagName: "span", attribs: {} };
        return {
          tagName: "img",
          attribs: {
            src: `/api/exams/${examId}/assets/${asset.id}`,
            alt: attributes.alt ?? asset.alt_text ?? asset.file_name
          } as Record<string, string>
        };
      }
    }
  }).trim();
}

export function importTeacherHtmlAnswers(rawHtml: string, examId: string, imageAssets: ExamAsset[] = []) {
  const $ = cheerio.load(rawHtml);
  const answers: ImportedHtmlAnswer[] = [];
  const seen = new Set<string>();

  $("section[data-question-number]").each((_index, element) => {
    const questionNumber = ($(element).attr("data-question-number") ?? "").trim();
    if (!questionNumber) throw new Error("Every answer section must have a non-empty data-question-number.");
    if (seen.has(questionNumber)) throw new Error(`Duplicate HTML answer for question ${questionNumber}.`);
    seen.add(questionNumber);

    const sanitized = sanitizeExamHtml($(element).html() ?? "", examId, imageAssets);
    if (!sanitized) throw new Error(`HTML answer for question ${questionNumber} is empty after sanitization.`);
    answers.push({ questionNumber, html: sanitized });
  });

  if (answers.length === 0) {
    throw new Error('The HTML file must contain at least one <section data-question-number="..."> answer.');
  }

  return answers;
}

export function mapTeacherAnswers<T extends { question_number: string }>(
  questions: T[],
  answers: ImportedHtmlAnswer[]
) {
  const questionNumbers = new Set(questions.map((question) => question.question_number));
  const answerMap = new Map(answers.map((answer) => [answer.questionNumber, answer.html]));
  const missing = [...questionNumbers].filter((number) => !answerMap.has(number));
  const extra = answers.map((answer) => answer.questionNumber).filter((number) => !questionNumbers.has(number));

  if (missing.length > 0 || extra.length > 0) {
    const details = [
      missing.length > 0 ? `Missing answers: ${missing.join(", ")}.` : "",
      extra.length > 0 ? `Answers without matching questions: ${extra.join(", ")}.` : ""
    ]
      .filter(Boolean)
      .join(" ");
    throw new Error(details);
  }

  return questions.map((question) => ({ ...question, answer_html: answerMap.get(question.question_number) ?? null }));
}
