import type { Worker as OcrWorker } from "tesseract.js";
import {
  detectFormat,
  parsePages,
  validateFile,
} from "../../../lib/validation";
import { runJob } from "../../../lib/pdf/client";
import { openPreview, renderPage } from "../../../lib/pdf/render";
import { pdfTextLayout } from "./layout";
import { structureDocument } from "../analysis/document";
import {
  MAX_TEXT_CHARACTERS,
  type ExtractOptions,
  type ExtractionProgress,
  type TextPage,
} from "../types";

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      cleanup();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const cleanup = () => signal.removeEventListener("abort", abort);
    if (signal.aborted) {
      void promise.catch(() => {});
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

export async function extractDocument(
  file: File,
  options: ExtractOptions,
  signal: AbortSignal,
  progress: (value: ExtractionProgress) => void,
): Promise<TextPage[]> {
  const signature = detectFormat(
    new Uint8Array(await file.slice(0, 16).arrayBuffer()),
  );
  const format = await validateFile(file, signature !== "pdf");
  signal.throwIfAborted();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const count =
    format === "pdf"
      ? await runJob<number>({ type: "inspect", bytes }, signal)
      : 1;
  const selected = parsePages(options.pages, count);
  if (selected.length > 10)
    throw new Error(
      "Extract up to 10 pages at a time. Enter a smaller page range.",
    );
  const pdf = format === "pdf" ? await openPreview(bytes) : undefined;
  let worker: OcrWorker | undefined;
  let abandoned = false;
  let activePage = 1;
  const stopWorker = () => {
    if (worker) void worker.terminate();
  };
  signal.addEventListener("abort", stopWorker, { once: true });
  const output: TextPage[] = [];
  let totalCharacters = 0;
  async function recognize(canvas: HTMLCanvasElement) {
    if (!worker) {
      progress({
        message: "Loading local recognition engine and language model…",
      });
      const { createWorker } = await import("tesseract.js");
      signal.throwIfAborted();
      let rejectEngine: (reason: Error) => void = () => {};
      const engineError = new Promise<never>((_, reject) => {
        rejectEngine = reject;
      });
      const initialization = createWorker(options.language, 1, {
        workerPath: `${location.origin}/ocr-assets/worker.min.js`,
        corePath: `${location.origin}/ocr-assets/core`,
        langPath: `${location.origin}/ocr-assets/lang`,
        workerBlobURL: false,
        cacheMethod: "none",
        logger: (message) => {
          if (!signal.aborted && !abandoned)
            progress({
              message:
                message.status === "recognizing text"
                  ? `Recognizing page ${activePage}…`
                  : "Preparing local OCR…",
              fraction:
                message.status === "recognizing text"
                  ? message.progress
                  : undefined,
            });
        },
        errorHandler: () =>
          rejectEngine(
            new Error(
              "OCR could not load or recognize this image. Check your connection for language assets and try again.",
            ),
          ),
      });
      void initialization.then(
        (value) => {
          if (abandoned || signal.aborted) void value.terminate();
        },
        () => {},
      );
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        worker = await abortable(
          Promise.race([
            initialization,
            engineError,
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () =>
                  reject(
                    new Error(
                      "OCR engine took too long to load. Please try again.",
                    ),
                  ),
                60_000,
              );
            }),
          ]),
          signal,
        );
      } finally {
        clearTimeout(timer);
      }
      await abortable(
        worker.setParameters({
          preserve_interword_spaces: "1",
          user_defined_dpi: "144",
          tessedit_pageseg_mode: (options.layout === "receipt"
            ? "6"
            : "3") as import("tesseract.js").PSM,
        }),
        signal,
      );
    }
    signal.throwIfAborted();
    const result = await abortable(
      worker.recognize(canvas, {}, { text: true, blocks: true }),
      signal,
    );
    const positioned = result.data.blocks?.flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.flatMap((line) =>
          line.words.map((word) => ({
            str: word.text,
            transform: [1, 0, 0, 1, word.bbox.x0, -line.bbox.y1],
            width: word.bbox.x1 - word.bbox.x0,
            height: line.bbox.y1 - line.bbox.y0,
          })),
        ),
      ),
    );
    return {
      text: positioned?.length
        ? pdfTextLayout(positioned)
        : result.data.text.trim(),
      confidence: result.data.confidence,
    };
  }
  try {
    for (const index of selected) {
      signal.throwIfAborted();
      activePage = index + 1;
      progress({ message: `Reading page ${activePage}…` });
      let text = "";
      if (pdf && options.mode !== "ocr") {
        const page = await pdf.getPage(index + 1);
        const content = await abortable(page.getTextContent(), signal);
        text = pdfTextLayout(content.items.filter((item) => "str" in item));
        page.cleanup();
      }
      let result: TextPage = { page: index + 1, text, method: "text" };
      if (
        options.mode === "ocr" ||
        (options.mode === "auto" && text.replace(/\s/g, "").length < 20)
      ) {
        let canvas: HTMLCanvasElement;
        if (pdf) canvas = await renderPage(pdf, index + 1, 2, signal);
        else {
          const bitmap = await createImageBitmap(file);
          try {
            if (bitmap.width * bitmap.height > 16_000_000)
              throw new Error(
                "OCR images must be no larger than 16 megapixels.",
              );
            canvas = document.createElement("canvas");
            const scale = Math.min(
              2,
              Math.max(1, 1200 / bitmap.width),
              Math.sqrt(16_000_000 / (bitmap.width * bitmap.height)),
            );
            canvas.width = Math.round(bitmap.width * scale);
            canvas.height = Math.round(bitmap.height * scale);
            const context = canvas.getContext("2d");
            if (!context)
              throw new Error(
                "Image processing is unavailable in this browser.",
              );
            context.fillStyle = "white";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.filter = "grayscale(1) contrast(1.15)";
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          } finally {
            bitmap.close();
          }
        }
        try {
          result = {
            page: index + 1,
            method: "ocr",
            ...(await recognize(canvas)),
          };
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      }
      totalCharacters += result.text.length;
      if (totalCharacters > MAX_TEXT_CHARACTERS)
        throw new Error(
          "Extracted text exceeds 200,000 characters. Select fewer pages.",
        );
      output.push({
        ...result,
        structure: structureDocument(result.text, options.layout === "receipt"),
      });
    }
    signal.throwIfAborted();
    return output;
  } finally {
    abandoned = true;
    signal.removeEventListener("abort", stopWorker);
    if (worker) await worker.terminate();
    if (pdf) await pdf.loadingTask.destroy();
  }
}
