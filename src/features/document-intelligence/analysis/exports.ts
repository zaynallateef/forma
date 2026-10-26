import type { DocumentStructure, TextPage } from "../types";
import { structureDocument } from "./document";
export function reviewedText(page: TextPage) {
  const s = page.structure;
  if (!s) return page.text;
  return [
    ...(s.kind === "document" && s.title !== "Document" ? [s.title] : []),
    ...s.details.map((f) => `${f.label}: ${f.value}`),
    ...s.items.map((i) =>
      [i.description, i.quantity, i.unitPrice, i.amount]
        .filter(Boolean)
        .join("  "),
    ),
    ...s.totals.map((f) => `${f.label}: ${f.value}`),
    ...s.sections.map((section) =>
      section.table
        ? [
            section.table.headers.join("  "),
            ...section.table.rows.map((row) => row.join("  ")),
          ].join("\n")
        : `${section.heading === "Document text" ? "" : section.heading + "\n"}${section.text}`,
    ),
  ].join("\n");
}
export function exportText(pages: TextPage[]) {
  return pages
    .map((page) => `--- Page ${page.page} ---\n${reviewedText(page)}`)
    .join("\n\n");
}
export function formattedMarkdown(pages: TextPage[]) {
  return pages
    .map((page) => {
      const s = page.structure ?? structureDocument(page.text);
      return [
        `# ${s.title}`,
        `Page ${page.page}`,
        ...s.details.map((field) => `- **${field.label}:** ${field.value}`),
        s.items.length
          ? "\n## Items\n\n| Description | Quantity | Unit price | Amount |\n| --- | --- | --- | --- |\n" +
            s.items
              .map(
                (item) =>
                  `| ${[item.description, item.quantity, item.unitPrice, item.amount].map((cell) => cell.replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`,
              )
              .join("\n")
          : "",
        s.totals.length
          ? "\n## Totals\n" +
            s.totals
              .map((field) => `- **${field.label}:** ${field.value}`)
              .join("\n")
          : "",
        ...s.sections.map(
          (section) =>
            `\n## ${section.heading}\n${section.table ? `\n| ${section.table.headers.join(" | ")} |\n| ${section.table.headers.map(() => "---").join(" | ")} |\n${section.table.rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}` : section.text}`,
        ),
      ]
        .filter(Boolean)
        .join("\n\n");
    })
    .join("\n\n---\n\n");
}
function csvCell(value: string) {
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function receiptCsv(pages: TextPage[]) {
  const rows: string[][] = [
    [
      "Page",
      "Section",
      "Description / field",
      "Quantity",
      "Unit price",
      "Amount / value",
    ],
  ];
  pages.forEach((page) => {
    const s: DocumentStructure = page.structure ?? structureDocument(page.text);
    s.details.forEach((f) =>
      rows.push([String(page.page), "Details", f.label, "", "", f.value]),
    );
    s.items.forEach((i) =>
      rows.push([
        String(page.page),
        "Items",
        i.description,
        i.quantity,
        i.unitPrice,
        i.amount,
      ]),
    );
    s.totals.forEach((f) =>
      rows.push([String(page.page), "Totals", f.label, "", "", f.value]),
    );
    s.sections.forEach((section) => {
      if (section.table) {
        rows.push([
          String(page.page),
          section.heading,
          section.table.headers.join(" / "),
          "",
          "",
          "",
        ]);
        section.table.rows.forEach((row) =>
          rows.push([
            String(page.page),
            section.heading,
            row.join(" / "),
            "",
            "",
            "",
          ]),
        );
      } else
        rows.push([
          String(page.page),
          section.heading,
          section.text,
          "",
          "",
          "",
        ]);
    });
  });
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export function structuredJson(pages: TextPage[]) {
  return JSON.stringify(
    pages.map((page) => ({
      page: page.page,
      method: page.method,
      confidence: page.confidence,
      document: page.structure ?? structureDocument(page.text),
    })),
    null,
    2,
  );
}
