import { test, expect, type Page } from "@playwright/test";
import { PDFDocument, PDFName } from "pdf-lib";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  (page as Page & { runtimeErrors: string[] }).runtimeErrors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as Page & { runtimeErrors: string[] }).runtimeErrors).toEqual(
    [],
  );
});
async function pdf(widths = [200, 300, 400]) {
  const doc = await PDFDocument.create();
  widths.forEach((width, i) => {
    const p = doc.addPage([width, 400]);
    p.drawText(`Forma fixture page ${i + 1}`, { x: 20, y: 200, size: 12 });
  });
  return Buffer.from(await doc.save());
}
async function upload(
  page: Page,
  files: { name: string; mimeType: string; buffer: Buffer }[],
) {
  await page.locator("input[type=file]").setInputFiles(files);
  await expect(page.getByRole("button", { name: /^Create / })).toBeEnabled();
}
async function download(page: Page) {
  await page.getByRole("button", { name: /^Create / }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download result" }).click();
  const result = await event;
  const path = await result.path();
  expect(path).toBeTruthy();
  return readFile(path!);
}
test("home, directory, keyboard, and responsive layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Documents made simple." }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto("/tools");
  await page.getByRole("searchbox").fill("merge");
  await expect(page.getByRole("link", { name: /Merge PDF/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /PDF to PNG/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("encrypted PDFs are rejected without a download", async ({ page }) => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.context.trailerInfo.Encrypt = doc.context.register(
    doc.context.obj({ Filter: PDFName.of("Standard"), V: 1, R: 2 }),
  );
  await page.goto("/tools/split-pdf");
  await page.locator("input[type=file]").setInputFiles({
    name: "locked.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  });
  await expect(page.getByRole("alert")).toContainText("Password-protected");
  await expect(page.getByRole("link", { name: "Download result" })).toHaveCount(
    0,
  );
});
test("homepage upload, mobile controls, keyboard sorting, and reset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "from-home.pdf",
    mimeType: "application/pdf",
    buffer: await pdf(),
  });
  await expect(page).toHaveURL(/organize-pdf/);
  await expect(page.getByRole("button", { name: "Create PDF" })).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".canvas-holder canvas")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Page 1 thumbnail", exact: true }),
  ).toBeVisible();
  const handle = page.getByRole("button", { name: "Move page 1", exact: true });
  await handle.scrollIntoViewIfNeeded();
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  // dnd-kit attaches the keyboard listener after activation and measures on the next frame.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("status")).toContainText("over droppable area 1");
  await page.keyboard.press("Space");
  await expect(handle).not.toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "test-results/workspace-mobile.png",
    fullPage: true,
  });
  const result = await PDFDocument.load(await download(page));
  expect(result.getPages().map((p) => p.getWidth())).toEqual([300, 200, 400]);
  await page.getByRole("button", { name: "Clear workspace" }).click();
  await expect(page.getByRole("link", { name: "Download result" })).toHaveCount(
    0,
  );
});
test("JPG and WebP decode into actual PDF pages", async ({ page }) => {
  await page.goto("/tools/images-to-pdf");
  const files = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 60;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "green";
    context.fillRect(0, 0, 40, 60);
    return ["image/jpeg", "image/webp"].map((type) => ({
      type,
      data: canvas.toDataURL(type).split(",")[1],
    }));
  });
  await upload(
    page,
    files.map((file, i) => ({
      name: i ? "image.webp" : "image.jpg",
      mimeType: file.type,
      buffer: Buffer.from(file.data, "base64"),
    })),
  );
  expect((await PDFDocument.load(await download(page))).getPageCount()).toBe(2);
});
test("invalid range can be corrected and selected pages extracted", async ({
  page,
}) => {
  await page.goto("/tools/extract-pages");
  await upload(page, [
    { name: "sample.pdf", mimeType: "application/pdf", buffer: await pdf() },
  ]);
  await page.getByLabel("Pages to export").fill("0");
  await page.getByRole("button", { name: "Create PDF" }).click();
  await expect(page.getByRole("alert")).toContainText("between 1 and 3");
  await page.getByLabel("Pages to export").fill("3,1");
  const output = await PDFDocument.load(await download(page));
  expect(output.getPages().map((p) => p.getWidth())).toEqual([400, 200]);
});
test("invalid and corrupt PDFs show errors", async ({ page }) => {
  await page.goto("/tools/pdf-to-png");
  await page.locator("input[type=file]").setInputFiles({
    name: "fake.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a PDF"),
  });
  await expect(page.getByRole("alert")).toContainText("valid PDF");
  await page.locator("input[type=file]").setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 broken"),
  });
  await expect(page.getByRole("alert")).toContainText("could not be read");
});
for (const format of ["png", "jpg"])
  test(`PDF to ${format}: selected page output is a real image`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/tools/pdf-to-${format}`);
    await upload(page, [
      { name: "sample.pdf", mimeType: "application/pdf", buffer: await pdf() },
    ]);
    await page.getByLabel("Pages to export").fill("2");
    const bytes = await download(page);
    expect(
      format === "png"
        ? bytes.subarray(0, 8).toString("hex")
        : bytes.subarray(0, 3).toString("hex"),
    ).toBe(format === "png" ? "89504e470d0a1a0a" : "ffd8ff");
    expect(bytes.length).toBeGreaterThan(500);
    expect(errors).toEqual([]);
  });
test("multiple PDF pages become a ZIP of images", async ({ page }) => {
  await page.goto("/tools/pdf-to-png");
  await upload(page, [
    { name: "sample.pdf", mimeType: "application/pdf", buffer: await pdf() },
  ]);
  const zip = await JSZip.loadAsync(await download(page));
  expect(Object.keys(zip.files)).toEqual([
    "page-1.png",
    "page-2.png",
    "page-3.png",
  ]);
});
test("merge honors file reordering and produces a valid PDF", async ({
  page,
}) => {
  await page.goto("/tools/merge-pdf");
  await upload(page, [
    {
      name: "first.pdf",
      mimeType: "application/pdf",
      buffer: await pdf([200]),
    },
    {
      name: "second.pdf",
      mimeType: "application/pdf",
      buffer: await pdf([300, 400]),
    },
  ]);
  await page.getByRole("button", { name: "Move second.pdf up" }).click();
  const result = await PDFDocument.load(await download(page));
  expect(result.getPages().map((p) => p.getWidth())).toEqual([300, 400, 200]);
});
test("split ranges produce valid single-page PDFs", async ({ page }) => {
  await page.goto("/tools/split-pdf");
  await upload(page, [
    { name: "sample.pdf", mimeType: "application/pdf", buffer: await pdf() },
  ]);
  await page.getByLabel("Pages to export").fill("1,3");
  await page.getByLabel("Output", { exact: true }).selectOption("true");
  const zip = await JSZip.loadAsync(await download(page));
  expect(Object.keys(zip.files)).toEqual(["page-1.pdf", "page-3.pdf"]);
  const last = await PDFDocument.load(
    await zip.file("page-3.pdf")!.async("uint8array"),
  );
  expect(last.getPageCount()).toBe(1);
  expect(last.getPage(0).getWidth()).toBe(400);
});
test("organize reorders, rotates and deletes actual pages", async ({
  page,
}) => {
  await page.goto("/tools/organize-pdf");
  await upload(page, [
    { name: "sample.pdf", mimeType: "application/pdf", buffer: await pdf() },
  ]);
  await page.getByRole("button", { name: "Move page 3 earlier" }).click();
  await page.getByRole("button", { name: "Rotate page 3" }).click();
  await page.getByRole("button", { name: "Delete page 1" }).click();
  const result = await PDFDocument.load(await download(page));
  expect(result.getPages().map((p) => p.getWidth())).toEqual([400, 300]);
  expect(result.getPage(0).getRotation().angle).toBe(90);
});
test("images become a valid multi-page landscape PDF", async ({ page }) => {
  await page.goto("/tools/images-to-pdf");
  const buffer = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 120;
      canvas.height = 80;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#c86b4a";
      context.fillRect(0, 0, 120, 80);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await upload(page, [
    { name: "one.png", mimeType: "image/png", buffer },
    { name: "two.png", mimeType: "image/png", buffer },
  ]);
  await page.getByLabel("Orientation").selectOption("true");
  const result = await PDFDocument.load(await download(page));
  expect(result.getPageCount()).toBe(2);
  expect(result.getPage(0).getWidth()).toBeGreaterThan(
    result.getPage(0).getHeight(),
  );
});
