import { cp, mkdir, readdir } from "node:fs/promises";
import { URL } from "node:url";
for (const name of ["cmaps", "standard_fonts", "wasm"]) {
  await mkdir(new URL("../public/pdf-assets/", import.meta.url), {
    recursive: true,
  });
  await cp(
    new URL(`../node_modules/pdfjs-dist/${name}`, import.meta.url),
    new URL(`../public/pdf-assets/${name}`, import.meta.url),
    { recursive: true },
  );
}
const ocrRoot = new URL("../public/ocr-assets/", import.meta.url);
await mkdir(new URL("core/", ocrRoot), { recursive: true });
await mkdir(new URL("lang/", ocrRoot), { recursive: true });
await cp(
  new URL("../node_modules/tesseract.js/dist/worker.min.js", import.meta.url),
  new URL("worker.min.js", ocrRoot),
);
const coreRoot = new URL("../node_modules/tesseract.js-core/", import.meta.url);
for (const name of await readdir(coreRoot)) {
  if (name.endsWith(".wasm") || name.endsWith(".wasm.js") || name === "LICENSE")
    await cp(new URL(name, coreRoot), new URL(`core/${name}`, ocrRoot));
}
for (const lang of ["eng", "ara"]) {
  await cp(
    new URL(
      `../node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,
      import.meta.url,
    ),
    new URL(`lang/${lang}.traineddata.gz`, ocrRoot),
  );
}
