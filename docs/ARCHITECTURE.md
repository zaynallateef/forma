# Architecture

Forma is a static React application. All PDF processing, OCR, receipt formatting, and exports run in the browser. It has no application server, database, account system, or remote document endpoint.

## Core document tools

Files pass signature and size validation before decoding. PDF manipulation runs in short-lived pdf-lib workers. PDF.js uses a bundled parser worker and renders one preview page or one thumbnail batch at a time. ZIP support loads on demand. Original bytes remain unchanged; outputs are real Blobs with temporary URLs released on replacement or unmount.

## OCR studio

```text
features/document-intelligence/
  IntelligencePage.tsx       Upload, settings, progress and result composition
  types.ts                  Shared document and extraction contracts
  studio.css                Responsive reader and receipt styles
  extraction/
    extract.ts              PDF text / Tesseract extraction and cleanup
    layout.ts               Positioned words into rows and columns
    useExtraction.ts        File and extraction lifecycle
  analysis/
    document.ts             Headings, paragraphs, lists and tables
    receipt.ts              Receipt fields, item columns and totals
    exports.ts              Markdown, CSV, JSON and reviewed text
    document.test.ts        Deterministic parsing and export checks
  components/
    TextReview.tsx          Page cards, display switch and exports
    DocumentView.tsx        Reading layout, highlights and section editing
    ReceiptView.tsx         Receipt details, items and highlighted totals
    AutoTextarea.tsx        Text editing without fixed inner scroll boxes
    DownloadText.tsx        Download URLs and cleanup
```

1. Validate a PDF/image and selected page range.
2. Read PDF text where available, or recognize a rendered page/image with Tesseract.
3. Group positioned words by baseline and retain column gaps. Arabic text uses right-to-left word ordering.
4. Detect a receipt using labels and monetary lines, or organize a general document into sections and tables.
5. Render readable paragraphs and lists. Dates, monetary values, and selected instruction words receive inline emphasis without generating new content.
6. Allow corrections to fields, tables, sections, or raw text. Exports use the reviewed structured values. Raw recognized text remains available in the Text view; changing raw text rebuilds the structure.

Receipt parsing is deterministic and conservative. Missing quantities/prices remain blank; unmatched lines remain in additional details. The recognition engine is Tesseract.js with bundled English/Arabic trained data. No custom model-training claim is made.

## Resources and limits

The install script copies PDF.js and Tesseract assets from pinned dependencies into ignored public asset directories. They are hosted with the application and load only when needed. Routes and OCR JavaScript load lazily. Recognition proceeds sequentially and initialized workers terminate on cancellation or completion. Initialization may finish loading assets before cleanup can release its worker.

Core limits are in `lib/validation.ts`. Extraction accepts at most ten selected pages, 200,000 characters, and a three-minute run budget. Canvas dimensions and decoded image pixels are bounded. These limits reduce memory pressure but do not guarantee handling of every compressed or malformed file.

## Tests and deployment

Vitest checks transformations and validation. Playwright exercises actual OCR, PDF workers, exports, responsive reading layouts, and output bytes. Receipt fixtures are synthetic and deterministic. See [verification](VERIFICATION.md).

The `dist/` directory is a self-contained static build. Cloudflare configuration is in `public/_headers` and `_redirects`; see [deployment](DEPLOYMENT.md).
