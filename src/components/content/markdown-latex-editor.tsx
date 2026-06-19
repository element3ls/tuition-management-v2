"use client";

import React, { useId, useState } from "react";
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
        <Textarea
          {...props}
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
