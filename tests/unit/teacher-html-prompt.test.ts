import { describe, expect, it } from "vitest";
import { teacherHtmlAnswerPrompt, teacherHtmlPromptFileName } from "@/lib/exams/teacher-html-prompt";

describe("teacher HTML external LLM prompt", () => {
  it("asks for filled strict answer sections", () => {
    expect(teacherHtmlPromptFileName).toBe("teacher-html-answer-prompt.txt");
    expect(teacherHtmlAnswerPrompt).toContain("Return ONLY the final answer HTML");
    expect(teacherHtmlAnswerPrompt).toContain('<section data-question-number="...">');
    expect(teacherHtmlAnswerPrompt).toContain("Put the complete worked answer inside each section.");
  });

  it("documents the import-safe HTML constraints", () => {
    expect(teacherHtmlAnswerPrompt).toContain('<img src="assets/exact-file-name.png" alt="description">');
    expect(teacherHtmlAnswerPrompt).toContain('<span data-math="x^2 + 1"></span>');
    expect(teacherHtmlAnswerPrompt).toContain("Do not use <script>, <style>, <a>, <iframe>, <form>");
    expect(teacherHtmlAnswerPrompt).not.toContain("```");
  });
});
