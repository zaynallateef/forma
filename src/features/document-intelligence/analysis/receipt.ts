import type { DocumentStructure, Field, ReceiptItem } from "../types";

export function normalizeDigits(text: string) {
  return text
    .replace(/[٠-٩۰-۹]/g, (value) =>
      String(value.charCodeAt(0) - (value >= "۰" ? 0x6f0 : 0x660)),
    )
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}
const totalLabel =
  /^(?:(?:grand\s+|net\s+)?total(?:\s+(?:due|amount))?|amount\s+due|balance\s+due|sub\s*total|tax(?:\s*\([^)]*\)|\s*\d+(?:\.\d+)?\s*%)?|vat(?:\s*\([^)]*\)|\s*\d+(?:\.\d+)?\s*%)?|discount|savings|tip|service(?:\s+charge)?|shipping|cash(?:\s+tendered)?|tendered|change|الإجمالي|الاجمالي|المجموع|المجموع\s+الفرعي|الإجمالي\s+الفرعي|ضريبة(?:\s+القيمة\s+المضافة)?|الضريبة|خصم|الخصم|الباقي)(?=\s|:|$)/i;
const metadataLabel =
  /^(date(?:\s*&\s*time)?|time|receipt(?:\s*(?:no\.?|number|#|id))?|invoice(?:\s*(?:no\.?|number|#|id))?|order(?:\s*(?:no\.?|number|#|id))?|transaction(?:\s*(?:no\.?|number|#|id))?|cashier|served\s+by|register|terminal|table|payment(?:\s+method)?|paid\s+by|card(?:\s*(?:type|number|no\.?))?|currency|tax\s*(?:id|no\.?)|vat\s*(?:id|no\.?)|tel(?:ephone)?|phone|address|التاريخ|الوقت|رقم\s+(?:الفاتورة|الطلب|الإيصال)|طريقة\s+الدفع|الهاتف|العنوان)\s*[:#-]?\s+(.+)$/i;
const moneyEnd =
  /((?:(?:USD|JOD|EUR|GBP|SAR|AED|CAD|AUD)\s*|[$€£]\s*)?-?\d[\d,.]*[.,]\d{1,3}(?:\s*(?:USD|JOD|EUR|GBP|SAR|AED|CAD|AUD|د\.?\s?أ|ر\.?\s?س))?)\s*$/i;
const itemHeader =
  /^(?:item|description|product|qty|quantity|الصنف|الوصف|الكمية)(?:\s|$)/i;
const receiptMarker =
  /\b(receipt|invoice|cashier|payment|thank\s+you|visa|mastercard)\b|فاتورة|إيصال|الضريبة|طريقة\s+الدفع/i;
const rule = /^[-_=*·.\s]{3,}$/;

function itemFromLine(line: string): ReceiptItem | null {
  const match = line.match(moneyEnd);
  if (!match || match.index === undefined) return null;
  let description = line.slice(0, match.index).trim();
  if (!/[\p{L}]/u.test(description) || description.length > 180) return null;
  const amount = match[1].trim();
  let quantity = "",
    unitPrice = "";
  const unit = description.match(/(?:\s+|\s*@\s*)(\d[\d,.]*[.,]\d{1,3})\s*$/);
  if (unit) {
    unitPrice = unit[1];
    description = description.slice(0, unit.index).trim();
  }
  const trailingQty = description.match(
    /\s+(\d+(?:[.,]\d+)?)\s*(?:[x×@])?\s*$/i,
  );
  const leadingQty = description.match(/^(\d+(?:[.,]\d+)?)\s*[x×]\s*(.+)$/i);
  if (trailingQty) {
    quantity = trailingQty[1];
    description = description.slice(0, trailingQty.index).trim();
  } else if (leadingQty) {
    quantity = leadingQty[1];
    description = leadingQty[2].trim();
  }
  if (!description) return null;
  return { description, quantity, unitPrice, amount, source: line };
}

export function parseReceipt(
  text: string,
  force = false,
): DocumentStructure | null {
  const lines = normalizeDigits(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !rule.test(line));
  const totals: Field[] = [],
    details: Field[] = [],
    items: ReceiptItem[] = [];
  const remaining: string[] = [];
  let title = "Receipt";
  let merchantFound = false;
  const hasTotal = lines.some(
    (line) => totalLabel.test(line) && moneyEnd.test(line),
  );
  const hasReceiptContext =
    receiptMarker.test(text) ||
    lines.some((line) => /^sub\s*total|المجموع\s+الفرعي/i.test(line)) ||
    lines.some((line) => itemHeader.test(line));
  if (!force && (!hasTotal || !hasReceiptContext)) return null;
  for (const line of lines) {
    if (
      totalLabel.test(line) &&
      !/^total\s+(?:items|quantity|qty)/i.test(line)
    ) {
      const amount = line.match(moneyEnd);
      if (amount && amount.index !== undefined) {
        totals.push({
          label: line
            .slice(0, amount.index)
            .replace(/[:.\s]+$/, "")
            .trim(),
          value: amount[1].trim(),
          source: line,
        });
        continue;
      }
    }
    const metadata = line.match(metadataLabel);
    if (metadata) {
      details.push({
        label: metadata[1].replace(/[:#]+$/, "").trim(),
        value: metadata[2].trim(),
        source: line,
      });
      continue;
    }
    if (itemHeader.test(line)) continue;
    if (/^(?:receipt|invoice|فاتورة|إيصال)$/i.test(line)) continue;
    const item = itemFromLine(line);
    if (item) {
      items.push(item);
      continue;
    }
    if (
      !merchantFound &&
      /^[\p{L}][\p{L}\p{N}\s&'’.,-]{2,70}$/u.test(line) &&
      !/^thank\s+you|شكرا|شكراً/i.test(line)
    ) {
      title = line;
      merchantFound = true;
      details.unshift({ label: "Merchant", value: line, source: line });
      continue;
    }
    if (!details.some((field) => /^date|التاريخ/i.test(field.label))) {
      const date = line.match(
        /\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\b/,
      );
      if (date) {
        details.push({ label: "Date", value: date[0], source: line });
        const rest = line.replace(date[0], "").trim();
        if (rest) remaining.push(rest);
        continue;
      }
    }
    if (/^(?:visa|mastercard|amex|credit|debit)\b/i.test(line)) {
      details.push({ label: "Payment", value: line, source: line });
      continue;
    }
    remaining.push(line);
  }
  return {
    kind: "receipt",
    title,
    details,
    items,
    totals,
    sections: remaining.length
      ? [{ heading: "Additional details", text: remaining.join("\n") }]
      : [],
  };
}
