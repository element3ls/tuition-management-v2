import "server-only";

import sharp from "sharp";

export async function normalizeExamImage(input: Buffer, rotation: 0 | 90 | 180 | 270 = 0) {
  const pipeline = sharp(input, { failOn: "error" }).rotate(rotation);
  const metadata = await pipeline.metadata();
  if (!metadata.width || !metadata.height) throw new Error("The uploaded image has invalid dimensions.");

  const output = await pipeline
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    width: output.info.width,
    height: output.info.height,
    mimeType: "image/webp" as const
  };
}
