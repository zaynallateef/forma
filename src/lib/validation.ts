export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const MAX_PAGES = 150;
export type Format = "pdf" | "png" | "jpg" | "webp";
export function detectFormat(bytes: Uint8Array): Format | null {
  const starts = (...values: number[]) =>
    values.every((v, i) => bytes[i] === v);
  if (starts(37, 80, 68, 70, 45)) return "pdf";
  if (starts(137, 80, 78, 71, 13, 10, 26, 10)) return "png";
  if (starts(255, 216, 255)) return "jpg";
  if (
    starts(82, 73, 70, 70) &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}
export async function validateFile(
  file: File,
  images: boolean,
): Promise<Format> {
  if (!file.size) throw new Error(`${file.name} is empty.`);
  if (file.size > MAX_FILE_BYTES)
    throw new Error(`${file.name} exceeds the 20 MB file limit.`);
  const format = detectFormat(
    new Uint8Array(await file.slice(0, 16).arrayBuffer()),
  );
  if (!format || (images ? format === "pdf" : format !== "pdf"))
    throw new Error(
      images
        ? "Please choose a valid PNG, JPG, or WebP image."
        : "Please choose a valid PDF document. Renaming a file does not convert it.",
    );
  return format;
}
export function parsePages(value: string, count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_PAGES)
    throw new Error("Document must contain 1–150 pages.");
  if (!value.trim() || value.trim().toLowerCase() === "all")
    return Array.from({ length: count }, (_, i) => i);
  const result = new Set<number>();
  for (const part of value.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("Use page numbers or ranges, such as 1, 3-5.");
    const start = Number(match[1]),
      end = Number(match[2] ?? match[1]);
    if (start < 1 || end > count || start > end)
      throw new Error(
        `Choose pages between 1 and ${count}, with ranges in ascending order.`,
      );
    for (let page = start; page <= end; page++) result.add(page - 1);
  }
  return [...result];
}
export function fitImage(
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
) {
  if (
    [width, height, pageWidth, pageHeight].some(
      (v) => !Number.isFinite(v) || v <= 0,
    ) ||
    !Number.isFinite(margin) ||
    margin < 0 ||
    margin * 2 >= Math.min(pageWidth, pageHeight)
  )
    throw new Error("Invalid image dimensions or page margins.");
  const scale = Math.min(
    (pageWidth - 2 * margin) / width,
    (pageHeight - 2 * margin) / height,
  );
  return {
    width: width * scale,
    height: height * scale,
    x: (pageWidth - width * scale) / 2,
    y: (pageHeight - height * scale) / 2,
  };
}
