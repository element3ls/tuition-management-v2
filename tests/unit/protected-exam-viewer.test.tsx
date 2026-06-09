import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProtectedExamViewer } from "@/components/content/protected-exam-viewer";

describe("protected exam viewer", () => {
  it("blocks casual copy, context-menu, and print shortcuts", () => {
    const { container } = render(
      <ProtectedExamViewer watermark="Student • student@example.com">
        <p>Protected answer</p>
      </ProtectedExamViewer>
    );
    const viewer = container.firstElementChild as HTMLElement;

    const contextMenu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    viewer.dispatchEvent(contextMenu);
    expect(contextMenu.defaultPrevented).toBe(true);

    const copy = new Event("copy", { bubbles: true, cancelable: true });
    viewer.dispatchEvent(copy);
    expect(copy.defaultPrevented).toBe(true);

    const print = new KeyboardEvent("keydown", { key: "p", ctrlKey: true, bubbles: true, cancelable: true });
    window.dispatchEvent(print);
    expect(print.defaultPrevented).toBe(true);

    expect(fireEvent.keyDown(window, { key: "a", ctrlKey: true })).toBe(true);
  });
});
