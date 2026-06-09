type SignedUploadOptions = {
  url: string;
  file: File;
  onProgress: (percentage: number) => void;
};

function uploadError(xhr: XMLHttpRequest) {
  try {
    const body = JSON.parse(xhr.responseText) as { error?: string; message?: string };
    return body.message ?? body.error ?? "Upload failed.";
  } catch {
    return xhr.responseText || "Upload failed.";
  }
}

export function uploadPdfToSignedUrl({ url, file, onProgress }: SignedUploadOptions) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      reject(new Error(uploadError(xhr)));
    });
    xhr.addEventListener("error", () => reject(new Error("The PDF upload could not reach storage.")));
    xhr.addEventListener("abort", () => reject(new Error("The PDF upload was cancelled.")));

    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}
