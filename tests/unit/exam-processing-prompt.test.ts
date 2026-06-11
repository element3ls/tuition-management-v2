import { describe, expect, it } from "vitest";
import { processingPrompt } from "@/lib/exams/ai";

describe("exam processing prompts", () => {
  it("requires answers for AI-solved mode", () => {
    const prompt = processingPrompt("ai_solved");
    expect(prompt).toContain("complete worked answer");
    expect(prompt).toContain("answer_text must never be null");
  });

  it("forbids answers in teacher HTML mode", () => {
    const prompt = processingPrompt("teacher_html");
    expect(prompt).toContain("must not solve, answer, hint at, or explain");
    expect(prompt).toContain("Set answer_text to null");
  });
});
