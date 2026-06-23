/* eslint-disable @next/next/no-img-element */
import React from "react";
import parse, { Element } from "html-react-parser";
import katex from "katex";

type InlineExamAsset = {
  id: string;
  altText: string | null;
};

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

export function SafeHtml({
  html,
  examId,
  inlineAssets = []
}: {
  html: string;
  examId?: string;
  inlineAssets?: InlineExamAsset[];
}) {
  const inlineAssetsById = new Map(inlineAssets.map((asset) => [asset.id, asset]));

  return (
    <div className="space-y-3 text-sm leading-7 [&_img]:h-auto [&_img]:max-w-full [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2">
      {parse(html, {
        replace(node) {
          if (!(node instanceof Element)) return;
          const inlineAssetId = node.attribs["data-exam-asset-id"];
          if (inlineAssetId !== undefined && examId) {
            const asset = inlineAssetsById.get(inlineAssetId);
            if (!asset) return <span />;
            return (
              <figure className="my-3 overflow-hidden rounded-lg border bg-muted/20 p-2">
                <img
                  src={`/api/exams/${examId}/assets/${asset.id}`}
                  alt={asset.altText ?? "Exam visual"}
                  draggable={false}
                  className="mx-auto h-auto max-h-[70vh] max-w-full rounded object-contain"
                />
                {asset.altText ? <figcaption className="mt-2 text-xs text-muted-foreground">{asset.altText}</figcaption> : null}
              </figure>
            );
          }
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
