import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichText } from "@/components/content/rich-text";

describe("exam rich text", () => {
  it("renders Markdown and LaTeX answers", () => {
    const { container, getByText } = render(<RichText>{"**Answer:** $x = 6$"}</RichText>);
    expect(getByText("Answer:")).toBeInTheDocument();
    expect(container.querySelector(".katex")).not.toBeNull();
  });

  it("renders AI-generated parenthesis and bracket LaTeX delimiters", () => {
    const { container } = render(
      <RichText>{"Gradient \\(m = 4\\).\n\n\\[\ny = 4x - \\frac12\n\\]"}</RichText>
    );

    expect(container.querySelectorAll(".katex")).toHaveLength(2);
    expect(container.querySelector(".katex-display")).not.toBeNull();
    expect(container.textContent).not.toContain("\\(");
    expect(container.textContent).not.toContain("\\[");
  });
});
