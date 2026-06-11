import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeExamImage } from "@/lib/exams/images";

describe("exam image normalization", () => {
  it("converts uploads to stripped WebP within the display dimension limit", async () => {
    const original = await sharp({
      create: { width: 3000, height: 1200, channels: 3, background: "#ffffff" }
    })
      .png()
      .withMetadata({ orientation: 1 })
      .toBuffer();

    const normalized = await normalizeExamImage(original, 90);
    const metadata = await sharp(normalized.buffer).metadata();

    expect(normalized.mimeType).toBe("image/webp");
    expect(Math.max(normalized.width, normalized.height)).toBeLessThanOrEqual(2400);
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
  });
});
