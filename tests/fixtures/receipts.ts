import { PDFDocument, StandardFonts } from "pdf-lib";
import type { Page } from "@playwright/test";
export const receiptRows = [
  ["FORMA MARKET"],
  ["Receipt No: F-0042"],
  ["Date: 2026-10-26 14:30"],
  ["Payment: VISA 4242"],
  ["Item", "Qty", "Unit", "Amount"],
  ["Coffee", "2", "3.50", "7.00"],
  ["Milk", "1", "2.25", "2.25"],
  ["Wholegrain bread", "1", "2.50", "2.50"],
  ["Subtotal", "", "", "11.75"],
  ["Tax (10%)", "", "", "1.18"],
  ["TOTAL USD", "", "", "12.93"],
  ["Thank you for shopping"],
];
export async function receiptImage(page: Page, type = "image/png") {
  const data = await page.evaluate(
    ({ rows, type }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1300;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, 1200, 1300);
      context.fillStyle = "#111";
      context.textBaseline = "top";
      rows.forEach((cells, row) => {
        context.font =
          row === 0
            ? "bold 48px Arial"
            : row === 10
              ? "bold 34px Courier New"
              : "32px Courier New";
        cells.forEach((cell, col) => {
          context.fillText(cell, [70, 650, 800, 990][col], 65 + row * 95);
        });
      });
      return canvas.toDataURL(type, 0.92).split(",")[1];
    },
    { rows: receiptRows, type },
  );
  return Buffer.from(data, "base64");
}
export async function receiptPdf(
  page: Page,
  scanned = false,
  multiple = false,
) {
  const document = await PDFDocument.create();
  if (scanned) {
    const image = await document.embedPng(await receiptImage(page));
    for (let i = 0; i < (multiple ? 2 : 1); i++) {
      const pdfPage = document.addPage([600, 650]);
      pdfPage.drawImage(image, { x: 0, y: 0, width: 600, height: 650 });
    }
  } else {
    const font = await document.embedFont(StandardFonts.Courier);
    const pdfPage = document.addPage([600, 700]);
    receiptRows.forEach((cells, row) =>
      cells.forEach((cell, col) =>
        pdfPage.drawText(cell, {
          x: [35, 325, 400, 495][col],
          y: 650 - row * 47,
          size: row === 0 ? 24 : 16,
          font,
        }),
      ),
    );
  }
  return Buffer.from(await document.save());
}
export const guideLines = [
  "Workshop safety guide",
  "Rule 1 - Prepare",
  "1. You must check the equipment before starting.",
  "Count all tools and report damaged parts.",
  "2. Never bypass the safety guard.",
  "",
  "Important: Wear protective equipment.",
  "Rule 2 - Finish",
  "1. Return all tools to storage.",
  "2. The inspection deadline is 2026-11-01.",
];
export async function guidePdf() {
  const document = await PDFDocument.create();
  const page = document.addPage([650, 800]);
  guideLines.forEach((line, index) => {
    if (line) page.drawText(line, { x: 35, y: 750 - index * 38, size: 14 });
  });
  return Buffer.from(await document.save());
}
