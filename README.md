# Forma

Documents made simple. A browser-based toolkit for converting PDFs, organizing pages, and extracting text from documents and receipts.

[Use Forma](https://forma-6l6.pages.dev/)

## Features

- Convert PDF pages to PNG or JPG, with page selection and resolution settings.
- Turn PNG, JPG, and WebP images into a PDF with custom ordering, margins, and page sizes.
- Merge, split, extract, reorder, rotate, and delete PDF pages.
- Preview documents and download results, including ZIP archives for multiple outputs.
- Extract English and Arabic text from images and scanned PDFs using local OCR.
- Read existing PDF text without OCR when a text layer is available.
- Review structured text with headings, lists, and highlights. Edit receipt details and item tables before exporting.
- Export extracted content as Markdown, CSV, JSON, or plain text.

No account, API key, or backend is required. There is no summarizer or external LLM integration.

## Privacy

Document processing runs in your browser. Files and extracted content are not sent to a document-processing server. OCR models, fonts, and workers are served with the website; the hosting provider may receive ordinary connection metadata.

Results are temporary. Download your work before closing or refreshing the page.

## Run locally

Use Node.js 22.12 or later. Node.js 24 was used during development.

```bash
npm install
npm run dev
```

Installation prepares the local OCR and PDF assets automatically. No environment variables are required. `.env.example` documents the optional public `VITE_GITHUB_URL` setting for a repository link; never put secrets in `VITE_` variables.

## Development

Built with React, TypeScript, Vite, Tailwind CSS, PDF.js, pdf-lib, Tesseract.js, and JSZip. PDF manipulation and OCR use browser workers.

```bash
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

Source code is in `src/`, browser tests and synthetic fixtures are in `tests/`, and asset preparation is in `scripts/`. Technical notes are in `docs/`.

## Limits

- Inputs are limited to 20 MB per file, 50 MB combined, and 150 PDF pages or images. Additional image and output-size limits protect browser memory.
- Text extraction supports up to 10 selected pages per run, with a 200,000-character limit and a three-minute processing budget.
- OCR works best with clear printed text. Handwriting, blurry scans, unusual layouts, complex tables, and Arabic reading order may need correction. Receipt fields and highlights use rules and can be wrong; check important amounts and details.
- Pages containing both scanned regions and existing text may need forced OCR. Large files can be slow on low-memory devices.
- Password-protected PDFs, Office conversion, and searchable-PDF OCR export are not supported.
- PDF editing may lose forms, bookmarks, attachments, metadata, or digital signatures. It is not a redaction tool.
- Automated browser tests cover Chromium. Other browsers and physical devices need further testing.

## Deployment

The website is hosted on Cloudflare Pages. Build with `npm run build` and deploy the complete `dist/` folder, including the generated OCR and PDF assets.

For a Git-based Pages build, use `npm run build`, output directory `dist`, and `NODE_VERSION=24`. Generated assets and build output are excluded from this repository and recreated during installation and building.

See [deployment](docs/DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md), [privacy](docs/PRIVACY.md), [verification](docs/VERIFICATION.md), and [roadmap](docs/ROADMAP.md) for details.
