import { describe, expect, it } from "vitest";
import { PDFDocument, degrees } from "pdf-lib";
import { editPdf, imagesToPdf, loadPdf, mergePdfs } from "./operations";
async function fixture(widths = [200, 300, 400]) {
  const doc = await PDFDocument.create();
  widths.forEach((width) => doc.addPage([width, 500]));
  if (widths.length > 1) doc.getPage(1).setRotation(degrees(90));
  return doc.save();
}
describe("real PDF operations", () => {
  it("merges PDFs preserving document and page order", async () => {
    const bytes = await mergePdfs([await fixture(), await fixture([450])]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPages().map((p) => p.getWidth())).toEqual([
      200, 300, 400, 450,
    ]);
  });
  it("reorders, deletes and rotates pages, preserving existing rotation", async () => {
    const bytes = await editPdf(await fixture(), [
      { index: 2, rotation: 90 },
      { index: 1, rotation: 90 },
    ]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPages().map((p) => p.getWidth())).toEqual([400, 300]);
    expect(pdf.getPages().map((p) => p.getRotation().angle)).toEqual([90, 180]);
  });
  it("extracts a single valid page", async () => {
    const bytes = await editPdf(await fixture(), [{ index: 1, rotation: 0 }]);
    expect((await loadPdf(bytes)).getPageCount()).toBe(1);
  });
  it("creates a multi-image PDF with correct paper orientation", async () => {
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=",
      ),
      (c) => c.charCodeAt(0),
    );
    const bytes = await imagesToPdf(
      [
        { bytes: png, format: "png" },
        { bytes: png, format: "png" },
      ],
      { size: "Letter", landscape: true, margin: 36 },
    );
    const pdf = await loadPdf(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 792, height: 612 });
  });
  it("rejects corrupt files and invalid operations", async () => {
    await expect(loadPdf(new Uint8Array([1, 2, 3]))).rejects.toThrow(
      "could not be read",
    );
    await expect(mergePdfs([])).rejects.toThrow();
    await expect(editPdf(await fixture(), [])).rejects.toThrow();
    await expect(
      editPdf(await fixture(), [{ index: 10, rotation: 0 }]),
    ).rejects.toThrow();
    await expect(
      imagesToPdf([], { size: "A4", landscape: false, margin: 0 }),
    ).rejects.toThrow();
  });
});
