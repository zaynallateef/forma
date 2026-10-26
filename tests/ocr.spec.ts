import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { guidePdf, receiptImage, receiptPdf } from "./fixtures/receipts";
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  (page as Page & { errors: string[] }).errors = errors;
});
test.afterEach(async ({ page }) =>
  expect((page as Page & { errors: string[] }).errors).toEqual([]),
);
async function read(
  page: Page,
  name: string,
  buffer: Buffer,
  mimeType: string,
) {
  await page
    .locator("input[type=file]")
    .setInputFiles({ name, mimeType, buffer });
  await expect(
    page.getByRole("button", { name: "Read document", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Read document", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your document, organized." }),
  ).toBeVisible({ timeout: 45000 });
}
async function download(page: Page, label: string) {
  const event = page.waitForEvent("download");
  await page.getByRole("link", { name: label, exact: true }).click();
  return readFile((await (await event).path())!, "utf8");
}
test("document output uses full-width sections, lists, highlights and readable spacing", async ({
  page,
}) => {
  const network: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" || r.url().includes("/api/"))
      network.push(r.url());
  });
  await page.goto("/studio");
  await read(page, "guide.pdf", await guidePdf(), "application/pdf");
  await expect(
    page.getByRole("heading", { name: "Rule 1 - Prepare", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rule 2 - Finish", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".reading-list li")).toHaveCount(4);
  await expect(page.locator("mark").first()).toBeVisible();
  await expect(page.locator(".document-callout").first()).toContainText(
    "Wear protective equipment",
  );
  await expect(page.getByText("Download summary", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator(".structured-document textarea")).toHaveCount(0);
  const padding = await page
    .locator(".structured-document")
    .evaluate((e) => parseFloat(getComputedStyle(e).paddingLeft));
  expect(padding).toBeGreaterThanOrEqual(28);
  await page
    .getByRole("button", { name: "Edit page 1 section 1", exact: true })
    .click();
  await page
    .getByLabel("Page 1 section 1", { exact: true })
    .fill("Important: Check all equipment.");
  await page
    .getByRole("button", { name: "Done editing page 1 section 1", exact: true })
    .click();
  await expect(page.locator(".document-callout").first()).toContainText(
    "Check all equipment",
  );
  expect(await download(page, "Markdown")).toContain("Check all equipment");
  await page.locator("#results").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/document-desktop.png",
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/document-mobile.png",
    fullPage: true,
  });
  expect(network).toEqual([]);
});
for (const [format, mime] of [
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["webp", "image/webp"],
])
  test(`receipt ${format} produces real editable details, items and totals`, async ({
    page,
  }) => {
    const outgoing: string[] = [];
    await page.goto("/studio?tool=receipts");
    const origin = new URL(page.url()).origin;
    page.on("request", (r) => {
      if (new URL(r.url()).origin !== origin) outgoing.push(r.url());
    });
    const buffer = await receiptImage(page, mime);
    await read(page, `receipt.${format}`, buffer, mime);
    await expect(
      page.getByRole("heading", { name: "FORMA MARKET", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Page 1 item 1 description", { exact: true }),
    ).toHaveValue(/Coffee/i);
    await expect(
      page.getByLabel("Page 1 item 1 quantity", { exact: true }),
    ).toHaveValue("2");
    await expect(
      page.getByLabel("Page 1 item 1 unitPrice", { exact: true }),
    ).toHaveValue("3.50");
    await expect(
      page.getByLabel("Page 1 item 1 amount", { exact: true }),
    ).toHaveValue("7.00");
    await expect(page.getByLabel("Page 1 TOTAL", { exact: true })).toHaveValue(
      /12\.93/,
    );
    await expect(page.locator(".receipt-main-total")).toContainText("12.93");
    await page
      .getByLabel("Page 1 item 1 description", { exact: true })
      .fill("Coffee beans");
    const data = JSON.parse(await download(page, "JSON"));
    expect(data[0].document.items[0].description).toBe("Coffee beans");
    expect(data[0].document.items).toHaveLength(3);
    expect(await download(page, "CSV")).toContain("Coffee beans");
    expect(await download(page, "Text")).toContain("Coffee beans");
    expect(outgoing).toEqual([]);
    if (format === "png") {
      await mkdir("test-results/fixtures", { recursive: true });
      await writeFile("test-results/fixtures/receipt.png", buffer);
      await page.locator("#results").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: "test-results/receipt-desktop.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      const layout = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll("body *")]
          .map((e) => ({
            tag: e.tagName,
            class: e.className,
            right: Math.round(e.getBoundingClientRect().right),
            width: Math.round(e.getBoundingClientRect().width),
          }))
          .filter((e) => e.right > innerWidth && e.width > innerWidth),
      }));
      await page.screenshot({
        path: "test-results/receipt-mobile.png",
        fullPage: true,
      });
      expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(
        layout.width,
      );
      await page.screenshot({
        path: "test-results/receipt-mobile.png",
        fullPage: true,
      });
    }
  });
for (const scanned of [false, true])
  test(`${scanned ? "scanned" : "text-layer"} receipt PDF keeps item columns and totals`, async ({
    page,
  }) => {
    await page.goto("/studio?tool=receipts");
    const buffer = await receiptPdf(page, scanned);
    await read(page, "receipt.pdf", buffer, "application/pdf");
    const data = JSON.parse(await download(page, "JSON"));
    expect(data[0].method).toBe(scanned ? "ocr" : "text");
    expect(
      data[0].document.items.map((item: { amount: string }) => item.amount),
    ).toEqual(["7.00", "2.25", "2.50"]);
    expect(
      data[0].document.totals.some((f: { value: string }) =>
        f.value.includes("12.93"),
      ),
    ).toBe(true);
    await mkdir("test-results/fixtures", { recursive: true });
    await writeFile(
      `test-results/fixtures/receipt-${scanned ? "scanned" : "native"}.pdf`,
      buffer,
    );
  });
test("multi-page scanned receipts remain separate and support page ranges", async ({
  page,
}) => {
  await page.goto("/studio?tool=receipts");
  const buffer = await receiptPdf(page, true, true);
  await page.getByLabel("Pages to read").fill("2");
  await read(page, "two-receipts.pdf", buffer, "application/pdf");
  const data = JSON.parse(await download(page, "JSON"));
  expect(data).toHaveLength(1);
  expect(data[0].page).toBe(2);
  expect(data[0].document.items).toHaveLength(3);
});
test("Arabic model reads Arabic script locally", async ({ page }) => {
  await page.goto("/studio");
  const buffer = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 1000;
      c.height = 250;
      const x = c.getContext("2d")!;
      x.fillStyle = "white";
      x.fillRect(0, 0, 1000, 250);
      x.fillStyle = "black";
      x.font = "bold 56px Arial";
      x.fillText("مرحبا بالعالم", 50, 120);
      return c.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page.getByLabel("Recognition language").selectOption("ara");
  await read(page, "arabic.png", buffer, "image/png");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(
    page.getByLabel("Text from page 1", { exact: true }),
  ).toHaveValue(/[\u0600-\u06ff]/);
});
test("raw text edits rebuild the formatted view and cancellation recovers", async ({
  page,
}) => {
  await page.goto("/studio");
  await read(page, "guide.pdf", await guidePdf(), "application/pdf");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page
    .getByLabel("Text from page 1", { exact: true })
    .fill("Updated guide\nRule 1 - Safety\n1. You must wear a helmet.");
  await page.getByRole("button", { name: "Formatted", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Updated guide", exact: true }),
  ).toBeVisible();
  expect(await download(page, "Text")).toContain("wear a helmet");
  await page.getByLabel("Reading method").selectOption("ocr");
  await page
    .getByRole("button", { name: "Read document", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel extraction" }).click();
  await expect(page.getByRole("alert")).toContainText("cancelled");
});
test("blank and invalid files have no fabricated receipt data", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.locator("input[type=file]").setInputFiles({
    name: "fake.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a PDF"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  const doc = await PDFDocument.create();
  doc.addPage();
  await read(
    page,
    "blank.pdf",
    Buffer.from(await doc.save()),
    "application/pdf",
  );
  await expect(page.getByRole("alert")).toContainText("No text found");
  expect(JSON.parse(await download(page, "JSON"))[0].document.items).toEqual(
    [],
  );
});
