# Forma

Documents made simple. PDF tools and local OCR, with no account required.

[Open website](https://forma-6l6.pages.dev/)

## Features

- Convert PDF pages to PNG or JPG.
- Convert PNG, JPG, and WebP images to PDF.
- Merge, split, extract, reorder, rotate, and delete PDF pages.
- Preview files and download results.
- Extract English and Arabic text from images and PDFs.
- Review and edit structured document text and receipt tables.
- Export text as Markdown, CSV, JSON, or plain text.

Files are processed in your browser. No backend, API key, or external LLM is required. OCR assets are served with the site; the host may receive ordinary connection metadata. Download results before refreshing or closing the page.

## Limits

- 20 MB per file, 50 MB combined input, and up to 150 PDF pages or images. Additional image and output limits protect browser memory.
- Text extraction supports up to 10 selected pages per run, 200,000 characters, and a three-minute processing budget.
- OCR and receipt detection can make mistakes. Check important text and amounts, especially with handwriting, blurry scans, complex layouts, and Arabic reading order.
- Mixed scanned and text pages may require forced OCR. Large documents can be slow on low-memory devices.
- Password-protected PDFs, Office conversion, searchable-PDF export, and summarization are not supported.
- PDF editing may lose forms, bookmarks, attachments, metadata, or digital signatures. This is not a redaction tool.
- Automated browser coverage targets Chromium; other browsers need further testing.

Built with React, TypeScript, Vite, Tailwind CSS, PDF.js, pdf-lib, Tesseract.js, and JSZip.
