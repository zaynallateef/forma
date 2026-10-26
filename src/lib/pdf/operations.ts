import { PDFDocument, degrees, PageSizes } from "pdf-lib";
import { fitImage, MAX_PAGES } from "../validation";
export type PageEdit = { index: number; rotation: number };
export type ImageInput = { bytes: Uint8Array; format: "png" | "jpg" };
export type PaperSettings = {
  size: "A4" | "Letter";
  landscape: boolean;
  margin: number;
};
export async function loadPdf(bytes: Uint8Array) {
  try {
    const pdf = await PDFDocument.load(bytes);
    if (pdf.getPageCount() < 1 || pdf.getPageCount() > MAX_PAGES)
      throw new Error("Documents must contain 1–150 pages.");
    return pdf;
  } catch (error) {
    if (error instanceof Error && /encrypt/i.test(error.message))
      throw new Error(
        "Password-protected PDFs are not supported. Export an unlocked copy first.",
        { cause: error },
      );
    if (error instanceof Error && /1–150/.test(error.message)) throw error;
    throw new Error(
      "This PDF could not be read. It may be damaged or unsupported.",
      { cause: error },
    );
  }
}
export async function mergePdfs(inputs: Uint8Array[]) {
  if (inputs.length < 2) throw new Error("Add at least two PDFs to merge.");
  const output = await PDFDocument.create();
  for (const bytes of inputs) {
    const input = await loadPdf(bytes);
    if (output.getPageCount() + input.getPageCount() > MAX_PAGES)
      throw new Error("The combined document exceeds 150 pages.");
    const pages = await output.copyPages(input, input.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }
  return output.save();
}
export async function editPdf(bytes: Uint8Array, edits: PageEdit[]) {
  const input = await loadPdf(bytes);
  if (!edits.length || edits.length > MAX_PAGES)
    throw new Error("Keep at least one page and no more than 150.");
  if (
    edits.some(
      (p) =>
        !Number.isInteger(p.index) ||
        p.index < 0 ||
        p.index >= input.getPageCount() ||
        !Number.isInteger(p.rotation) ||
        p.rotation % 90 !== 0,
    )
  )
    throw new Error("Invalid page selection or rotation.");
  const output = await PDFDocument.create();
  const pages = await output.copyPages(
    input,
    edits.map((p) => p.index),
  );
  pages.forEach((page, i) => {
    page.setRotation(
      degrees((page.getRotation().angle + edits[i].rotation) % 360),
    );
    output.addPage(page);
  });
  return output.save();
}
export async function imagesToPdf(
  images: ImageInput[],
  settings: PaperSettings,
) {
  if (!images.length || images.length > MAX_PAGES)
    throw new Error("Choose 1–150 images.");
  const output = await PDFDocument.create();
  const dimensions = [...PageSizes[settings.size]];
  if (settings.landscape) dimensions.reverse();
  for (const image of images) {
    const embedded =
      image.format === "jpg"
        ? await output.embedJpg(image.bytes)
        : await output.embedPng(image.bytes);
    const page = output.addPage(dimensions as [number, number]);
    page.drawImage(
      embedded,
      fitImage(
        embedded.width,
        embedded.height,
        dimensions[0],
        dimensions[1],
        settings.margin,
      ),
    );
  }
  return output.save();
}
