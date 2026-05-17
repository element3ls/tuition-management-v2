import { describe, expect, it } from "vitest";
import { cloneDemoData, demoIds } from "@/lib/demo-data";
import { createMaterialSignedUrl, validateMaterialFile } from "@/lib/storage/materials";

describe("material storage", () => {
  it("validates material file type and size", () => {
    expect(validateMaterialFile({ mimeType: "application/pdf", sizeBytes: 1024 })).toBeNull();
    expect(validateMaterialFile({ mimeType: "text/html", sizeBytes: 1024 })).toBe("File type is not allowed.");
    expect(validateMaterialFile({ mimeType: "application/pdf", sizeBytes: 26 * 1024 * 1024 })).toBe("File is larger than 25 MB.");
  });

  it("requires permission before creating signed URL", async () => {
    const data = cloneDemoData();
    await expect(
      createMaterialSignedUrl({ userId: demoIds.otherStudent, materialId: demoIds.material, permission: "view", data })
    ).resolves.toEqual({ ok: false, error: "Access denied." });
  });
});
