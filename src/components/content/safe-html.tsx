/* eslint-disable @next/next/no-img-element */
import React from "react";
import parse, { Element } from "html-react-parser";
import katex from "katex";

function MathMarkup({ value, display }: { value: string; display: boolean }) {
  return (
    <span
      className={display ? "my-3 block overflow-x-auto text-center" : "inline"}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(value, { displayMode: display, throwOnError: false, strict: "warn" })
      }}
    />
  );
}

export function SafeHtml({ html }: { html: string }) {
  return (
    <div className="space-y-3 text-sm leading-7 [&_img]:h-auto [&_img]:max-w-full [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2">
      {parse(html, {
        replace(node) {
          if (!(node instanceof Element)) return;
          const inlineMath = node.attribs["data-math"];
          const displayMath = node.attribs["data-math-display"];
          if (inlineMath !== undefined) return <MathMarkup value={inlineMath} display={false} />;
          if (displayMath !== undefined) return <MathMarkup value={displayMath} display />;
          if (node.name === "img") {
            // Asset URLs are produced by the server sanitizer and require an authenticated route.
            return (
              <img
                src={node.attribs.src}
                alt={node.attribs.alt ?? ""}
                width={node.attribs.width ? Number(node.attribs.width) : undefined}
                height={node.attribs.height ? Number(node.attribs.height) : undefined}
                draggable={false}
                className="rounded-md border"
              />
            );
          }
          return undefined;
        }
      })}
    </div>
  );
}
