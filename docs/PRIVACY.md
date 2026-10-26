# Privacy

Document conversion, organization, OCR, and receipt formatting run on the device in the browser. Forma has no document-upload endpoint, account database, remote processing service, analytics, or advertising code.

Application JavaScript, fonts, workers, OCR models, and PDF decoders load from the website's host. The hosting provider may receive normal connection metadata such as IP address and request timestamps. OCR makes no request to an external model host. Tesseract's persistent language cache is disabled; ordinary browser HTTP caching of assets may still occur.

Uploaded files and extracted data remain in memory while the workspace is open. Resetting or closing the workspace releases application references; browser memory reclamation is not secure erasure. Downloaded files remain in the user's selected folder. Source text, edited values, and exports are not persisted to localStorage or a document database.

File signatures are validated before decoding. Limits bound input bytes, page counts, image dimensions, rendering pixels, and extracted text. Recognition and document workers are cleaned up after processing; initialization may complete before a cancelled worker can be released. Complex compressed files can still consume substantial memory.

Receipt fields are detected by rules and can contain recognition or classification errors. Missing values are not inferred. Verify names, dates, quantities, and amounts against the original before relying on them. CSV exports neutralize leading formula characters to reduce spreadsheet formula injection risk.

The production Content Security Policy permits same-origin scripts/workers and WebAssembly, with no external service origins. Editing PDFs can invalidate digital signatures and may not preserve document-level forms or metadata. Forma is not a secure redaction tool. Browser extensions, device compromise, operating-system backups, and the user's downloaded files are outside its control.
