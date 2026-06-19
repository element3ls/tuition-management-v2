import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("inserts formatting and math templates at the cursor", async () => {
    render(
      <form>
        <MarkdownLatexEditor label="Question text" name="question_text" defaultValue="Solve x" />
      </form>
    );

    const textarea = screen.getByLabelText("Question text") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(6, 7);

    fireEvent.click(screen.getByRole("button", { name: "Inline equation" }));
    expect(textarea).toHaveValue("Solve $x$");

    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    fireEvent.click(screen.getByRole("button", { name: "Fraction" }));
    expect(textarea).toHaveValue("Solve $x$$\\frac{a}{b}$");

    await waitFor(() => {
      expect(textarea.selectionStart).toBe("Solve $x$$\\frac{".length);
      expect(textarea.selectionEnd).toBe("Solve $x$$\\frac{a".length);
    });
  });

  it("inserts mathematical symbols from the toolbar", () => {
    render(
      <form>
        <MarkdownLatexEditor label="Question text" name="question_text" />
      </form>
    );

    const textarea = screen.getByLabelText("Question text");
    fireEvent.click(screen.getByRole("button", { name: "Pi" }));
    fireEvent.click(screen.getByRole("button", { name: "Greater than or equal" }));

    expect(textarea).toHaveValue("$\\pi$$\\ge$");
  });
});
