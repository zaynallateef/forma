import { runJob } from "../../lib/pdf/client";
import { canvasBlob, openPreview, renderPage } from "../../lib/pdf/render";
import { isImageTool, isOrganizeTool } from "../../lib/tools";
import { parsePages } from "../../lib/validation";
import type { PageEdit, PaperSettings } from "../../lib/pdf/operations";
export type LoadedFile = {
  id: string;
  file: File;
  bytes: Uint8Array;
  count: number;
  width?: number;
  height?: number;
  url?: string;
  format: "pdf" | "png" | "jpg" | "webp";
};
export type Settings = PaperSettings & {
  pages: string;
  scale: number;
  quality: number;
  separate: boolean;
};
export type Output = { blob: Blob; name: string };
export async function bundle(outputs: Output[]): Promise<Output> {
  if (outputs.length === 1) return outputs[0];
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  outputs.forEach((output) => zip.file(output.name, output.blob));
  return {
    blob: await zip.generateAsync({ type: "blob" }),
    name: "forma-pages.zip",
  };
}
export async function processFiles(
  id: string,
  files: LoadedFile[],
  settings: Settings,
  edits: PageEdit[],
  signal: AbortSignal,
  status: (value: string) => void,
): Promise<Output> {
  if (!files.length) throw new Error("Add a document first.");
  const pdfOutput = (bytes: Uint8Array, name: string): Output => ({
    blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    name,
  });
  if (isImageTool(id)) {
    const images = [];
    for (const item of files) {
      signal.throwIfAborted();
      // Canvas normalizes orientation and supports WebP without embedding unsupported data.
      const bitmap = await createImageBitmap(item.file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        throw new Error("Image decoding is unavailable.");
      }
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const blob = await canvasBlob(canvas, "image/png");
      canvas.width = 0;
      canvas.height = 0;
      images.push({
        bytes: new Uint8Array(await blob.arrayBuffer()),
        format: "png" as const,
      });
    }
    return pdfOutput(
      await runJob<Uint8Array>({ type: "images", images, settings }, signal),
      "forma-images.pdf",
    );
  }
  if (id === "merge-pdf")
    return pdfOutput(
      await runJob<Uint8Array>(
        { type: "merge", inputs: files.map((f) => f.bytes) },
        signal,
      ),
      "forma-merged.pdf",
    );
  if (isOrganizeTool(id))
    return pdfOutput(
      await runJob<Uint8Array>(
        { type: "edit", bytes: files[0].bytes, edits },
        signal,
      ),
      "forma-organized.pdf",
    );
  const pages = parsePages(settings.pages, files[0].count);
  const outputs: Output[] = [];
  if (id === "split-pdf" || id === "extract-pages") {
    if (!settings.separate)
      return pdfOutput(
        await runJob<Uint8Array>(
          {
            type: "edit",
            bytes: files[0].bytes,
            edits: pages.map((index) => ({ index, rotation: 0 })),
          },
          signal,
        ),
        "forma-extracted.pdf",
      );
    for (const index of pages) {
      status(`Extracting page ${outputs.length + 1} of ${pages.length}`);
      outputs.push(
        pdfOutput(
          await runJob<Uint8Array>(
            {
              type: "edit",
              bytes: files[0].bytes,
              edits: [{ index, rotation: 0 }],
            },
            signal,
          ),
          `page-${index + 1}.pdf`,
        ),
      );
    }
  } else {
    const pdf = await openPreview(files[0].bytes);
    const jpg = id === "pdf-to-jpg";
    let outputBytes = 0;
    try {
      for (const index of pages) {
        status(`Rendering page ${outputs.length + 1} of ${pages.length}`);
        const canvas = await renderPage(pdf, index + 1, settings.scale, signal);
        const blob = await canvasBlob(
          canvas,
          jpg ? "image/jpeg" : "image/png",
          settings.quality,
        );
        canvas.width = 0;
        canvas.height = 0;
        outputBytes += blob.size;
        if (outputBytes > 100 * 1024 * 1024)
          throw new Error(
            "Output exceeds 100 MB. Select fewer pages or a lower resolution.",
          );
        outputs.push({
          blob,
          name: `page-${index + 1}.${jpg ? "jpg" : "png"}`,
        });
      }
    } finally {
      await pdf.loadingTask.destroy();
    }
  }
  signal.throwIfAborted();
  status("Preparing your download…");
  return bundle(outputs);
}
