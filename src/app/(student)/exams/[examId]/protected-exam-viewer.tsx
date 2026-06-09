"use client";

import React, { useEffect } from "react";

export function ProtectedExamViewer({
  watermark,
  children
}: {
  watermark: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const blockShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (["c", "p", "s", "u"].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", blockShortcut);
    return () => window.removeEventListener("keydown", blockShortcut);
  }, []);

  return (
    <div
      className="protected-exam-content relative select-none overflow-hidden"
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 grid grid-cols-2 gap-24 overflow-hidden p-8 opacity-[0.055]">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} className="-rotate-[24deg] whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-foreground">
            {watermark}
          </span>
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
