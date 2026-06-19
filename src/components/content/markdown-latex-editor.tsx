"use client";

import React, { useId, useRef, useState } from "react";
import { IconEye, IconPencil } from "@tabler/icons-react";
import { RichText } from "@/components/content/rich-text";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EditorView = "write" | "preview";

type MarkdownLatexEditorProps = Omit<React.ComponentProps<"textarea">, "children" | "defaultValue" | "value"> & {
  label: string;
  name: string;
  defaultValue?: string;
  textareaClassName?: string;
};

type InsertTemplate = {
  label: string;
  text: string;
  template: string;
  fallback?: string;
  selectFallback?: boolean;
};

const valueMarker = "%%VALUE%%";

const textActions: InsertTemplate[] = [
  { label: "Bold", text: "B", template: `**${valueMarker}**`, fallback: "text", selectFallback: true },
  { label: "Italic", text: "I", template: `_${valueMarker}_`, fallback: "text", selectFallback: true },
  { label: "Bullet list", text: "•", template: `\n- ${valueMarker}\n`, fallback: "item", selectFallback: true },
  { label: "Numbered list", text: "1.", template: `\n1. ${valueMarker}\n`, fallback: "item", selectFallback: true }
];

const equationActions: InsertTemplate[] = [
  { label: "Inline equation", text: "$x$", template: `$${valueMarker}$`, fallback: "x = 1", selectFallback: true },
  { label: "Display equation", text: "$$", template: `\n$$\n${valueMarker}\n$$\n`, fallback: "x = 1", selectFallback: true },
  { label: "Fraction", text: "a/b", template: `$\\frac{${valueMarker}}{b}$`, fallback: "a", selectFallback: true },
  { label: "Square root", text: "√", template: `$\\sqrt{${valueMarker}}$`, fallback: "x", selectFallback: true },
  { label: "Power", text: "x²", template: `$${valueMarker}^{2}$`, fallback: "x", selectFallback: true },
  { label: "Subscript", text: "x₁", template: `$${valueMarker}_{1}$`, fallback: "x", selectFallback: true }
];

const symbolActions: InsertTemplate[] = [
  { label: "Pi", text: "π", template: "$\\pi$" },
  { label: "Theta", text: "θ", template: "$\\theta$" },
  { label: "Delta", text: "Δ", template: "$\\Delta$" },
  { label: "Infinity", text: "∞", template: "$\\infty$" },
  { label: "Less than or equal", text: "≤", template: "$\\le$" },
  { label: "Greater than or equal", text: "≥", template: "$\\ge$" },
  { label: "Not equal", text: "≠", template: "$\\ne$" },
  { label: "Plus or minus", text: "±", template: "$\\pm$" },
  { label: "Times", text: "×", template: "$\\times$" },
  { label: "Divide", text: "÷", template: "$\\div$" },
  { label: "Angle", text: "∠", template: "$\\angle$" },
  { label: "Degree", text: "°", template: "$^\\circ$" }
];

export function MarkdownLatexEditor({
  label,
  name,
  id,
  defaultValue = "",
  className,
  textareaClassName,
  disabled,
  onChange,
  ...props
}: MarkdownLatexEditorProps) {
  const generatedId = useId();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaId = id ?? generatedId;
  const writeTabId = `${textareaId}-write-tab`;
  const previewTabId = `${textareaId}-preview-tab`;
  const previewId = `${textareaId}-preview`;
  const [view, setView] = useState<EditorView>("write");
  const [value, setValue] = useState(defaultValue);

  const tabClassName = (tab: EditorView) =>
    cn(
      "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      view === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    );

  const toolbarButtonClassName =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50";

  const insertTemplate = (action: InsertTemplate) => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? value.length;
    const selectionEnd = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(selectionStart, selectionEnd);
    const insertedValue = selected || action.fallback || "";
    const fallbackStart = action.template.indexOf(valueMarker);
    const snippet = action.template.replace(valueMarker, insertedValue);
    const nextValue = `${value.slice(0, selectionStart)}${snippet}${value.slice(selectionEnd)}`;
    const shouldSelectFallback = action.selectFallback && !selected && fallbackStart >= 0;
    const cursorStart = shouldSelectFallback ? selectionStart + fallbackStart : selectionStart + snippet.length;
    const cursorEnd = shouldSelectFallback ? cursorStart + insertedValue.length : cursorStart;

    setValue(nextValue);
    setView("write");
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursorStart, cursorEnd);
    }, 0);
  };

  const renderToolbarButton = (action: InsertTemplate, className?: string) => (
    <button
      key={action.label}
      type="button"
      className={cn(toolbarButtonClassName, className)}
      aria-label={action.label}
      title={action.label}
      disabled={disabled}
      onClick={() => insertTemplate(action)}
    >
      {action.text}
    </button>
  );

  return (
    <div className={cn("grid gap-1.5 text-sm font-medium text-foreground", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={textareaId}>{label}</label>
        <div className="inline-flex rounded-md bg-muted p-1" role="tablist" aria-label={`${label} editor view`}>
          <button
            id={writeTabId}
            type="button"
            role="tab"
            aria-selected={view === "write"}
            aria-controls={textareaId}
            className={tabClassName("write")}
            disabled={disabled}
            onClick={() => setView("write")}
          >
            <IconPencil className="size-3.5" />
            Write
          </button>
          <button
            id={previewTabId}
            type="button"
            role="tab"
            aria-selected={view === "preview"}
            aria-controls={previewId}
            className={tabClassName("preview")}
            onClick={() => setView("preview")}
          >
            <IconEye className="size-3.5" />
            Preview
          </button>
        </div>
      </div>

      <div className={view === "write" ? "block" : "hidden"}>
        <div className="mb-2 grid gap-2 rounded-lg border border-border bg-muted/20 p-2">
          <div className="flex flex-wrap gap-1.5" aria-label="Text formatting tools">
            {textActions.map((action) =>
              renderToolbarButton(action, action.label === "Italic" ? "font-serif italic" : action.label === "Bold" ? "text-sm font-bold" : undefined)
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Equation tools">
            {equationActions.map((action) => renderToolbarButton(action))}
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Mathematical symbols">
            {symbolActions.map((action) => renderToolbarButton(action, "font-serif text-sm"))}
          </div>
        </div>
        <Textarea
          {...props}
          ref={textareaRef}
          id={textareaId}
          name={name}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            setValue(event.target.value);
            onChange?.(event);
          }}
          className={cn("min-h-48 font-mono text-sm", textareaClassName)}
        />
      </div>

      <div id={previewId} role="tabpanel" aria-labelledby={previewTabId} className={view === "preview" ? "block" : "hidden"}>
        <div className="min-h-48 rounded-lg border border-input bg-background px-3 py-3">
          {value.trim() ? <RichText>{value}</RichText> : <p className="text-sm text-muted-foreground">Nothing to preview.</p>}
        </div>
      </div>
    </div>
  );
}
