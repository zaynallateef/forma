import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerUrl;
export async function openPreview(bytes: Uint8Array) {
  const task = getDocument({
    data: bytes.slice(),
    cMapUrl: "/pdf-assets/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/pdf-assets/standard_fonts/",
    wasmUrl: "/pdf-assets/wasm/",
  });
  try {
    return await task.promise;
  } catch (error) {
    await task.destroy();
    throw error;
  }
}
export async function renderPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const page = await pdf.getPage(pageNumber);
  signal?.throwIfAborted();
  const viewport = page.getViewport({ scale });
  if (
    viewport.width * viewport.height > 16_000_000 ||
    Math.max(viewport.width, viewport.height) > 8192
  )
    throw new Error(
      "This page is too large at this resolution. Choose a lower resolution.",
    );
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Your browser could not create an image canvas.");
  const task = page.render({
    canvas,
    canvasContext: context,
    viewport,
    background: "white",
  });
  const cancel = () => task.cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    await task.promise;
    signal?.throwIfAborted();
    return canvas;
  } catch (error) {
    canvas.width = 0;
    canvas.height = 0;
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancel);
    page.cleanup();
  }
}
export function canvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality = 0.9,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image export failed.")),
      type,
      quality,
    ),
  );
}
