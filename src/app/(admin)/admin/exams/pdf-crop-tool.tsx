"use client";

import { useEffect, useRef, useState } from "react";
import { Crop, LoaderCircle } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { uploadExamAsset } from "@/lib/exams/client-assets";
import type { ExamAsset } from "@/types/domain";

type Point = { x: number; y: number };
type Selection = { x: number; y: number; width: number; height: number };

function selectionFrom(start: Point, end: Point): Selection {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

export function PdfCropTool({
  examId,
  role: controlledRole,
  onRoleChange,
  showRoleSelect = true,
  onUploaded
}: {
  examId: string;
  role?: "question_visual" | "answer_visual";
  onRoleChange?: (role: "question_visual" | "answer_visual") => void;
  showRoleSelect?: boolean;
  onUploaded: (asset: ExamAsset) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [internalRole, setInternalRole] = useState<"question_visual" | "answer_visual">("question_visual");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const role = controlledRole ?? internalRole;
  const setRole = (nextRole: "question_visual" | "answer_visual") => {
    if (!controlledRole) setInternalRole(nextRole);
    onRoleChange?.(nextRole);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const response = await fetch(`/api/admin/exams/${examId}/source`);
        if (!response.ok) throw new Error("Could not load the source PDF.");
        const document = await pdfjs.getDocument({ data: await response.arrayBuffer() }).promise;
        if (!cancelled) {
          setPdf(document);
          setPageCount(document.numPages);
          setBusy(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load the PDF crop tool.");
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable.");
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        setSelection(null);
      } catch (renderError) {
        if (!cancelled) setError(renderError instanceof Error ? renderError.message : "Could not render the PDF page.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageNumber, pdf]);

  const pointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    };
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selection || selection.width < 8 || selection.height < 8) return;
    setBusy(true);
    setError(null);
    try {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.round(selection.width * scaleX);
      cropCanvas.height = Math.round(selection.height * scaleY);
      const context = cropCanvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable.");
      context.drawImage(
        canvas,
        selection.x * scaleX,
        selection.y * scaleY,
        selection.width * scaleX,
        selection.height * scaleY,
        0,
        0,
        cropCanvas.width,
        cropCanvas.height
      );
      const blob = await new Promise<Blob | null>((resolve) => cropCanvas.toBlob(resolve, "image/webp", 0.92));
      if (!blob) throw new Error("Could not create the cropped graph image.");
      const file = new File([blob], `page-${pageNumber}-${role}.webp`, { type: "image/webp" });
      const asset = await uploadExamAsset({
        examId,
        file,
        role,
        sourcePage: pageNumber,
        crop: {
          x: selection.x / rect.width,
          y: selection.y / rect.height,
          width: selection.width / rect.width,
          height: selection.height / rect.height
        },
        altText: `${role === "question_visual" ? "Question" : "Answer"} visual from source page ${pageNumber}`
      });
      onUploaded(asset);
      setSelection(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the cropped graph.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-medium">
          PDF page
          <Input
            type="number"
            min={1}
            max={pageCount || 1}
            value={pageNumber}
            disabled={busy || pageCount === 0}
            onChange={(event) => setPageNumber(Math.max(1, Math.min(pageCount, Number(event.target.value))))}
            className="w-24"
          />
        </label>
        {showRoleSelect ? (
          <label className="grid gap-1 text-xs font-medium">
            Attach as
            <Select value={role} disabled={busy} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option value="question_visual">Question visual</option>
              <option value="answer_visual">Answer visual</option>
            </Select>
          </label>
        ) : null}
        <Button type="button" onClick={() => void save()} disabled={busy || !selection || selection.width < 8 || selection.height < 8}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Crop />}
          Save crop
        </Button>
        <span className="text-xs text-muted-foreground">
          {pageCount > 0 ? `${pageCount} pages. Drag over a graph or diagram.` : "Loading PDF..."}
        </span>
      </div>
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <div
        className="relative max-h-[65vh] w-fit max-w-full touch-none overflow-auto rounded border bg-muted"
        onPointerDown={(event) => {
          const point = pointer(event);
          setStart(point);
          setSelection({ ...point, width: 0, height: 0 });
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!start) return;
          setSelection(selectionFrom(start, pointer(event)));
        }}
        onPointerUp={(event) => {
          if (start) setSelection(selectionFrom(start, pointer(event)));
          setStart(null);
        }}
      >
        <canvas ref={canvasRef} className="block h-auto max-w-full cursor-crosshair" />
        {selection ? (
          <div
            className="pointer-events-none absolute border-2 border-primary bg-primary/15"
            style={{ left: selection.x, top: selection.y, width: selection.width, height: selection.height }}
          />
        ) : null}
      </div>
    </div>
  );
}
