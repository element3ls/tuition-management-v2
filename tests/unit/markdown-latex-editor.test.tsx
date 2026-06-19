import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownLatexEditor } from "@/components/content/markdown-latex-editor";

describe("MarkdownLatexEditor", () => {
  it("keeps the markdown source in the form field and renders a LaTeX preview", () => {
    const { container } = render(
      <form>
        <MarkdownLatexEditor label="Question text" name="question_text" defaultValue="Find **x** when $x = 2$." required />
      </form>
    );

    const textarea = screen.getByLabelText("Question text");
    expect(textarea).toHaveAttribute("name", "question_text");
    expect(textarea).toHaveValue("Find **x** when $x = 2$.");

    fireEvent.change(textarea, { target: { value: "Solve for **x**: $x = 4$" } });
    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));

    expect(textarea).toHaveValue("Solve for **x**: $x = 4$");
    expect(screen.getByText("x", { selector: "strong" })).toBeInTheDocument();
    expect(container.querySelector(".katex")).not.toBeNull();
  });
});
