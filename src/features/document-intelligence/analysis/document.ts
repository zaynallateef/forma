import type { DocumentStructure, TextSection } from "../types";
import { parseReceipt } from "./receipt";
function isHeading(line: string) {
  if (
    line.length < 3 ||
    line.length > 95 ||
    /[.!?؟]$/.test(line) ||
    !/[\p{L}]/u.test(line)
  )
    return false;
  return (
    /^(?:rule|chapter|section|part|appendix)\s+[\dIVX]+(?:\s|[.:—–-])/i.test(
      line,
    ) ||
    /^(?:القاعدة|الفصل|القسم|الباب)\s+/u.test(line) ||
    (line.endsWith(":") && line.length < 65) ||
    (line === line.toLocaleUpperCase() && !/^\d+[.)]\s/.test(line))
  );
}
function isTitle(line: string) {
  return (
    line.length >= 8 &&
    line.length <= 110 &&
    !/[.!?؟:;]$/.test(line) &&
    !/^\d+[.)]\s/.test(line) &&
    !/^\s*[|]/.test(line) &&
    line.split(/\s+/).length <= 16
  );
}
export function structureDocument(
  text: string,
  forceReceipt = false,
): DocumentStructure {
  const receipt = parseReceipt(text, forceReceipt);
  if (receipt) return receipt;
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim());
  while (lines[0] === "") lines.shift();
  const title =
    lines.length > 1 && isTitle(lines[0]) && !isHeading(lines[0])
      ? lines.shift()!
      : "Document";
  const sections: TextSection[] = [];
  let current: TextSection = { heading: "Overview", text: "" };
  const flush = () => {
    if (current.text.trim()) {
      sections.push({ ...current, text: current.text.trim() });
    }
  };
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) {
      if (current.text && !current.text.endsWith("\n\n"))
        current.text += "\n\n";
      continue;
    }
    const columns = lines[i].split(/\s{2,}|\s*\|\s*/).filter(Boolean);
    if (columns.length >= 2 && i + 1 < lines.length) {
      const rows: string[][] = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const row = lines[j].split(/\s{2,}|\s*\|\s*/).filter(Boolean);
        if (row.length !== columns.length) break;
        rows.push(row);
      }
      if (rows.length) {
        flush();
        sections.push({
          heading: current.heading === "Overview" ? "Table" : current.heading,
          text: "",
          table: { headers: columns, rows },
        });
        current = { heading: "Details", text: "" };
        i = j - 1;
        continue;
      }
    }
    if (isHeading(lines[i])) {
      flush();
      current = { heading: lines[i].replace(/:$/, ""), text: "" };
    } else
      current.text +=
        (current.text && !current.text.endsWith("\n") ? "\n" : "") + lines[i];
  }
  flush();
  if (!sections.length)
    sections.push({ heading: "Document text", text: lines.join("\n") });
  return {
    kind: "document",
    title:
      title === "Document" &&
      sections[0]?.heading !== "Overview" &&
      sections[0]?.heading !== "Document text"
        ? (sections[0]?.heading ?? "Document")
        : title,
    details: [],
    items: [],
    totals: [],
    sections,
  };
}
export type ReadBlock =
  | { kind: "paragraph" | "note"; text: string }
  | { kind: "list"; items: { marker: string; text: string }[] };
export function readingBlocks(text: string): ReadBlock[] {
  const blocks: ReadBlock[] = [];
  let paragraph = "";
  let list: { marker: string; text: string }[] = [];
  const flushParagraph = () => {
    if (paragraph.trim())
      blocks.push({
        kind: /^(?:important|note|warning|penalty|deadline|ملاحظة|تنبيه|تحذير)\s*[:—–-]/i.test(
          paragraph,
        )
          ? "note"
          : "paragraph",
        text: paragraph.trim(),
      });
    paragraph = "";
  };
  const flushList = () => {
    if (list.length) blocks.push({ kind: "list", items: list });
    list = [];
  };
  for (const line of text.split("\n")) {
    const match = line
      .trim()
      .match(/^(\d+[.)]|[a-z][.)]|[ivx]+[.)]|[•●*-])\s+(.+)$/i);
    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (
      /^(?:important|note|warning|penalty|deadline|ملاحظة|تنبيه|تحذير)\s*[:—–-]/i.test(
        line.trim(),
      )
    ) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "note", text: line.trim() });
    } else if (match) {
      flushParagraph();
      list.push({ marker: match[1], text: match[2] });
    } else if (list.length) list[list.length - 1].text += " " + line.trim();
    else paragraph += (paragraph ? " " : "") + line.trim();
  }
  flushParagraph();
  flushList();
  return blocks;
}
