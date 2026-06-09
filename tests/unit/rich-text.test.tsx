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
});
