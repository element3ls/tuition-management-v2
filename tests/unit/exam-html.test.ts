import { describe, expect, it } from "vitest";
import { importTeacherHtmlAnswers, mapTeacherAnswers, sanitizeExamHtml } from "@/lib/exams/html";
import type { ExamAsset } from "@/types/domain";

const imageAsset: ExamAsset = {
  organization_id: "01000000-0000-4000-8000-000000000001",
  id: "74000000-0000-4000-8000-000000000001",
  exam_id: "72000000-0000-4000-8000-000000000001",
  question_id: null,
  role: "html_image",
  variant: "display",
  original_asset_id: "74000000-0000-4000-8000-000000000002",
  storage_bucket: "exam-assets",
  storage_key: "exam/display/image.webp",
  file_name: "graph.png",
  mime_type: "image/webp",
  size_bytes: 100,
  upload_status: "ready",
  sort_order: 0,
  placement: "after_content",
  source_page: null,
  crop_x: null,
  crop_y: null,
  crop_width: null,
  crop_height: null,
  width: 100,
  height: 100,
  rotation: 0,
  alt_text: "Graph",
  student_visible: true,
  uploaded_by: null,
  created_at: "2026-06-10T00:00:00.000Z",
  updated_at: "2026-06-10T00:00:00.000Z"
};

const inlineAsset: ExamAsset = {
  ...imageAsset,
  id: "74000000-0000-4000-8000-000000000003",
  role: "answer_visual",
  original_asset_id: "74000000-0000-4000-8000-000000000004",
  file_name: "diagram.png",
  alt_text: "Diagram",
  placement: "inline",
  student_visible: false
};

describe("teacher HTML answers", () => {
  it("maps strict question sections, local images, and math markers", () => {
    const answers = importTeacherHtmlAnswers(
      '<section data-question-number="1"><p>Use <span data-math>x^2</span>.</p><img src="assets/graph.png" onerror="alert(1)"></section>',
      imageAsset.exam_id,
      [imageAsset]
    );

    expect(answers).toHaveLength(1);
    expect(answers[0].html).toContain('data-math="x^2"');
    expect(answers[0].html).toContain(`/api/exams/${imageAsset.exam_id}/assets/${imageAsset.id}`);
    expect(answers[0].html).not.toContain("onerror");
    expect(mapTeacherAnswers([{ question_number: "1" }], answers)[0].answer_html).toBe(answers[0].html);
  });

  it("rejects duplicate, missing, extra, and external image mappings", () => {
    expect(() =>
      importTeacherHtmlAnswers(
        '<section data-question-number="1"><p>A</p></section><section data-question-number="1"><p>B</p></section>',
        imageAsset.exam_id
      )
    ).toThrow(/Duplicate/);
    expect(() =>
      mapTeacherAnswers(
        [{ question_number: "1" }, { question_number: "2" }],
        [{ questionNumber: "1", html: "<p>A</p>" }]
      )
    ).toThrow(/Missing answers: 2/);
    expect(() =>
      mapTeacherAnswers([{ question_number: "1" }], [
        { questionNumber: "1", html: "<p>A</p>" },
        { questionNumber: "9", html: "<p>B</p>" }
      ])
    ).toThrow(/without matching questions: 9/);
    expect(() => sanitizeExamHtml('<img src="https://example.com/graph.png">', imageAsset.exam_id, [imageAsset])).toThrow(
      /not allowed/
    );
  });

  it("removes stored-XSS payloads and preserves already-protected local images", () => {
    const protectedUrl = `/api/exams/${imageAsset.exam_id}/assets/${imageAsset.id}`;
    const html = sanitizeExamHtml(
      `<script>alert(1)</script><p onclick="alert(1)">Answer</p><a href="javascript:alert(1)">bad link</a><img src="${protectedUrl}">`,
      imageAsset.exam_id,
      [imageAsset]
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<a");
    expect(html).toContain(protectedUrl);
  });

  it("preserves attached inline visual placeholders and rejects unattached ones", () => {
    const html = sanitizeExamHtml(
      `<p>Use the diagram.</p><div data-exam-asset-id="${inlineAsset.id}">ignored</div>`,
      imageAsset.exam_id,
      [imageAsset, inlineAsset]
    );

    expect(html).toContain(`data-exam-asset-id="${inlineAsset.id}"`);
    expect(html).not.toContain("ignored");
    expect(() =>
      sanitizeExamHtml('<div data-exam-asset-id="74000000-0000-4000-8000-000000000099"></div>', imageAsset.exam_id, [
        imageAsset,
        inlineAsset
      ])
    ).toThrow(/not attached/);
  });
});
