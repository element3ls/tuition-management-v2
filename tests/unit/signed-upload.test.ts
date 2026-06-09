import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadPdfToSignedUrl } from "@/lib/exams/signed-upload";

type Listener = (event: ProgressEvent) => void;

class MockXMLHttpRequest {
  static instance: MockXMLHttpRequest;

  status = 0;
  responseText = "";
  method = "";
  url = "";
  body: Document | XMLHttpRequestBodyInit | null = null;
  listeners = new Map<string, Listener>();
  uploadListeners = new Map<string, Listener>();
  upload = {
    addEventListener: (name: string, listener: Listener) => this.uploadListeners.set(name, listener)
  };

  constructor() {
    MockXMLHttpRequest.instance = this;
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  addEventListener(name: string, listener: Listener) {
    this.listeners.set(name, listener);
  }

  send(body: Document | XMLHttpRequestBodyInit | null) {
    this.body = body;
  }

  emit(name: string, event = new ProgressEvent(name)) {
    this.listeners.get(name)?.(event);
  }
}

describe("uploadPdfToSignedUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads the PDF with progress using the signed URL", async () => {
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);
    const progress = vi.fn();
    const file = new File(["%PDF-1.4"], "exam.pdf", { type: "application/pdf" });

    const pending = uploadPdfToSignedUrl({
      url: "https://example.supabase.co/storage/v1/object/upload/sign/exams/exam.pdf?token=test",
      file,
      onProgress: progress
    });
    const xhr = MockXMLHttpRequest.instance;
    xhr.uploadListeners.get("progress")?.(
      new ProgressEvent("progress", { lengthComputable: true, loaded: 5, total: 10 })
    );
    xhr.status = 200;
    xhr.emit("load");

    await expect(pending).resolves.toBeUndefined();
    expect(xhr.method).toBe("PUT");
    expect(xhr.body).toBeInstanceOf(FormData);
    expect((xhr.body as FormData).get("cacheControl")).toBe("3600");
    expect((xhr.body as FormData).get("")).toBe(file);
    expect(progress).toHaveBeenNthCalledWith(1, 50);
    expect(progress).toHaveBeenLastCalledWith(100);
  });

  it("returns the storage error message", async () => {
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);
    const file = new File(["%PDF-1.4"], "exam.pdf", { type: "application/pdf" });

    const pending = uploadPdfToSignedUrl({
      url: "https://example.supabase.co/upload",
      file,
      onProgress: vi.fn()
    });
    const xhr = MockXMLHttpRequest.instance;
    xhr.status = 403;
    xhr.responseText = JSON.stringify({ message: "Upload token expired." });
    xhr.emit("load");

    await expect(pending).rejects.toThrow("Upload token expired.");
  });
});
