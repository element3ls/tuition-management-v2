import { describe, expect, it } from "vitest";
import { teacherHtmlAnswerPrompt, teacherHtmlPromptFileName } from "@/lib/exams/teacher-html-prompt";

describe("teacher HTML external LLM prompt", () => {
  it("asks for filled strict answer sections", () => {
    expect(teacherHtmlPromptFileName).toBe("teacher-html-answer-prompt.txt");
    expect(teacherHtmlAnswerPrompt).toContain("Write the full worked solution in chat first.");
    expect(teacherHtmlAnswerPrompt).toContain('<section data-question-number="...">');
    expect(teacherHtmlAnswerPrompt).toContain("Put the complete worked answer inside each section.");
  });

  it("asks for the sample-style worked solution layout within each section", () => {
    expect(teacherHtmlAnswerPrompt).toContain("Match a clean full-solution worksheet style");
    expect(teacherHtmlAnswerPrompt).toContain("Start each section with a heading containing the question number");
    expect(teacherHtmlAnswerPrompt).toContain("Put every equation, substitution, simplification, and final expression in its own display-math block.");
    expect(teacherHtmlAnswerPrompt).toContain('<p>Final answer:</p>');
    expect(teacherHtmlAnswerPrompt).toContain('<div data-math-display="\\boxed{x = 4}">\\[\\boxed{x = 4}\\]</div>');
  });

  it("asks for one downloadable full HTML file with MathJax or KaTeX", () => {
    expect(teacherHtmlAnswerPrompt).toContain("Create one full upload-ready HTML file");
    expect(teacherHtmlAnswerPrompt).toContain("Include a complete HTML document with <!DOCTYPE html>, <html>, <head>, <body>, CSS, and MathJax or KaTeX setup.");
    expect(teacherHtmlAnswerPrompt).toContain("Equations must be displayed using MathJax or KaTeX");
    expect(teacherHtmlAnswerPrompt).toContain("One download link for the full HTML file.");
    expect(teacherHtmlAnswerPrompt).toContain("Do not create separate part/subpart HTML files.");
  });

  it("documents section-safe HTML constraints", () => {
    expect(teacherHtmlAnswerPrompt).toContain('<img src="assets/exact-file-name.png" alt="description">');
    expect(teacherHtmlAnswerPrompt).toContain('<span data-math="x^2 + 1">\\(x^2 + 1\\)</span>');
    expect(teacherHtmlAnswerPrompt).toContain("The full HTML document may use CSS and MathJax or KaTeX scripts in <head>.");
    expect(teacherHtmlAnswerPrompt).toContain('Do not place <script>, <style>, <a>, <iframe>, <form>');
    expect(teacherHtmlAnswerPrompt).not.toContain("```");
  });
});
