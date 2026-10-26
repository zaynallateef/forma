import { describe, expect, it } from "vitest";
import { structureDocument, readingBlocks } from "./document";
import { parseReceipt, normalizeDigits } from "./receipt";
import {
  exportText,
  formattedMarkdown,
  receiptCsv,
  structuredJson,
} from "./exports";
import { pdfTextLayout } from "../extraction/layout";
const receipt = `FORMA MARKET\nReceipt No: F-0042\nDate: 2026-10-26 14:30\nPayment: VISA 4242\nItem  Qty  Unit  Amount\nCoffee  2  3.50  7.00\nMilk  1  2.25  2.25\nWholegrain bread  1  2.50  2.50\nSubtotal 11.75\nTax (10%) 1.18\nTOTAL USD 12.93\nThank you for shopping`;
describe("receipt organization", () => {
  it("extracts actual details, item columns and totals", () => {
    const result = parseReceipt(receipt)!;
    expect(result.kind).toBe("receipt");
    expect(result.title).toBe("FORMA MARKET");
    expect(result.details.find((f) => /^Date/.test(f.label))?.value).toBe(
      "2026-10-26 14:30",
    );
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({
      description: "Coffee",
      quantity: "2",
      unitPrice: "3.50",
      amount: "7.00",
    });
    expect(result.totals.find((f) => f.label === "TOTAL")?.value).toBe(
      "USD 12.93",
    );
    expect(result.sections[0].text).toContain("Thank you");
  });
  it("does not fabricate missing quantity or unit price", () => {
    const result = parseReceipt("SHOP\nReceipt\nBread 2.50\nTOTAL 2.50")!;
    expect(result.items[0]).toMatchObject({
      description: "Bread",
      quantity: "",
      unitPrice: "",
      amount: "2.50",
    });
  });
  it("handles Arabic digits and known Arabic receipt labels", () => {
    expect(normalizeDigits("١٢٫٩٣")).toBe("12.93");
    const result = parseReceipt(
      "متجر المدينة\nفاتورة\nالتاريخ: ٢٠٢٦-١٠-٢٦\nحليب  ١  ٢٫٥٠  ٢٫٥٠\nالإجمالي ٢٫٥٠",
    )!;
    expect(result.kind).toBe("receipt");
    expect(result.items[0].amount).toBe("2.50");
    expect(result.totals[0].value).toBe("2.50");
  });
  it("avoids treating an ordinary document as a receipt", () => {
    expect(
      parseReceipt(
        "Annual report\nTotal revenue 123.45\nResults are improving.",
      ),
    ).toBeNull();
  });
});
describe("document reading layout", () => {
  it("separates a title and rule headings without turning list items into headings", () => {
    const document = structureDocument(
      "Workshop safety guide\nRule 1 – Prepare\n1. You must check the equipment.\nCount all tools before starting.\n2. Never bypass the guard.\nRule 2 – Finish\n1. Return all tools to storage.",
    );
    expect(document.title).toBe("Workshop safety guide");
    expect(document.sections.map((s) => s.heading)).toEqual([
      "Rule 1 – Prepare",
      "Rule 2 – Finish",
    ]);
    const blocks = readingBlocks(document.sections[0].text);
    expect(blocks[0].kind).toBe("list");
    if (blocks[0].kind === "list") {
      expect(blocks[0].items).toHaveLength(2);
      expect(blocks[0].items[0].text).toContain("Count all tools");
    }
  });
  it("retains paragraph breaks and identifies labeled notes", () => {
    const blocks = readingBlocks(
      "First paragraph.\nA wrapped line.\n\nImportant: Wear protective equipment.",
    );
    expect(blocks).toEqual([
      { kind: "paragraph", text: "First paragraph. A wrapped line." },
      { kind: "note", text: "Important: Wear protective equipment." },
    ]);
  });
  it("keeps table columns and all rows", () => {
    const result = structureDocument(
      "Stock report\nProduct  Quantity  Price\nCoffee  2  7.00\nMilk  1  2.25",
    );
    expect(result.sections[0].table?.headers).toEqual([
      "Product",
      "Quantity",
      "Price",
    ]);
    expect(result.sections[0].table?.rows).toHaveLength(2);
  });
  it("handles empty input without invented values", () => {
    expect(structureDocument("").sections[0].text).toBe("");
  });
  it("reconstructs positioned PDF columns and baselines", () => {
    const item = (str: string, x: number, y: number) => ({
      str,
      transform: [1, 0, 0, 1, x, y],
      width: str.length * 5,
      height: 10,
    });
    expect(
      pdfTextLayout([
        item("Milk", 10, 100),
        item("1", 160, 100),
        item("2.25", 220, 100),
        item("TOTAL", 10, 70),
        item("2.25", 220, 70),
      ]),
    ).toBe("Milk  1  2.25\nTOTAL  2.25");
  });
});
describe("local exports", () => {
  it("exports corrections in Markdown, CSV, JSON, and text", () => {
    const structure = parseReceipt(receipt)!;
    structure.items[0].amount = "8.00";
    const pages = [
      { page: 1, text: receipt, method: "ocr" as const, structure },
    ];
    expect(formattedMarkdown(pages)).toContain("| Coffee | 2 | 3.50 | 8.00 |");
    expect(receiptCsv(pages)).toContain('"8.00"');
    expect(JSON.parse(structuredJson(pages))[0].document.items[0].amount).toBe(
      "8.00",
    );
    expect(exportText(pages)).toContain("Coffee  2  3.50  8.00");
  });
  it("neutralizes spreadsheet formulas and escapes CSV quotes", () => {
    const structure = parseReceipt(receipt)!;
    structure.items[0].description = '=HYPERLINK("example")';
    expect(
      receiptCsv([{ page: 1, text: receipt, method: "ocr", structure }]),
    ).toContain('"\'=HYPERLINK(""example"")"');
  });
});
