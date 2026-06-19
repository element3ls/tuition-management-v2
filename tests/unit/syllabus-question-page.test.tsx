import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuestionPage from "@/app/(student)/questions/[questionId]/page";
import { requireStudentAccess } from "@/lib/auth/session";
import { cloneDemoData, demoIds } from "@/lib/demo-data";
import { canAccessResource } from "@/lib/permissions";
import { getAppData } from "@/server/data/app-data";

vi.mock("@/lib/auth/session", () => ({
  requireStudentAccess: vi.fn()
}));

vi.mock("@/lib/permissions", () => ({
  canAccessResource: vi.fn()
}));

vi.mock("@/server/data/app-data", () => ({
  getAppData: vi.fn()
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  })
}));

describe("syllabus question page", () => {
  beforeEach(() => {
    const data = cloneDemoData();
    const student = data.profiles.find((profile) => profile.id === demoIds.student);

    data.questions[0].question_text = "Find **x** when $x = 6$.";

    vi.mocked(requireStudentAccess).mockResolvedValue({ user: student!, roles: ["student"] });
    vi.mocked(getAppData).mockResolvedValue(data);
    vi.mocked(canAccessResource).mockResolvedValue(true);
  });

  it("renders syllabus question text as Markdown with LaTeX", async () => {
    const ui = await QuestionPage({ params: Promise.resolve({ questionId: demoIds.question }) });
    const { container } = render(ui);

    expect(screen.getByText("x", { selector: "strong" })).toBeInTheDocument();
    expect(container.querySelector(".katex")).not.toBeNull();
  });
});
