export type TextPage = {
  page: number;
  text: string;
  method: "text" | "ocr";
  confidence?: number;
  structure?: DocumentStructure;
};
export type Field = { label: string; value: string; source: string };
export type ReceiptItem = {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  source: string;
};
export type TextSection = {
  heading: string;
  text: string;
  table?: { headers: string[]; rows: string[][] };
};
export type DocumentStructure = {
  kind: "receipt" | "document";
  title: string;
  details: Field[];
  items: ReceiptItem[];
  totals: Field[];
  sections: TextSection[];
};
export type ExtractOptions = {
  language: "eng" | "ara" | "eng+ara";
  mode: "auto" | "ocr" | "text";
  pages: string;
  layout?: "auto" | "receipt";
};
export type ExtractionProgress = { message: string; fraction?: number };
export const MAX_TEXT_CHARACTERS = 200_000;
