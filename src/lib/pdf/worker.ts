import { editPdf, imagesToPdf, loadPdf, mergePdfs } from "./operations";
import type { ImageInput, PageEdit, PaperSettings } from "./operations";
export type Job =
  | { type: "inspect"; bytes: Uint8Array }
  | { type: "merge"; inputs: Uint8Array[] }
  | { type: "edit"; bytes: Uint8Array; edits: PageEdit[] }
  | { type: "images"; images: ImageInput[]; settings: PaperSettings };
self.onmessage = async ({ data }: MessageEvent<Job>) => {
  try {
    let result: Uint8Array | number;
    switch (data.type) {
      case "inspect":
        result = (await loadPdf(data.bytes)).getPageCount();
        break;
      case "merge":
        result = await mergePdfs(data.inputs);
        break;
      case "edit":
        result = await editPdf(data.bytes, data.edits);
        break;
      case "images":
        result = await imagesToPdf(data.images, data.settings);
        break;
    }
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Document processing failed.",
    });
  }
};
