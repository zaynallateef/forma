import { useState } from "react";
import {
  LayoutList,
  AlignLeft,
  Files,
  Table2,
  Type,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { TextPage } from "../types";
import { structureDocument } from "../analysis/document";
import {
  formattedMarkdown,
  receiptCsv,
  structuredJson,
  exportText,
} from "../analysis/exports";
import { ReceiptView } from "./ReceiptView";
import { DocumentView } from "./DocumentView";
import { DownloadText } from "./DownloadText";
import { AutoTextarea } from "./AutoTextarea";
export function TextReview({
  pages,
  setPages,
  disabled,
}: {
  pages: TextPage[];
  setPages: (pages: TextPage[]) => void;
  disabled: boolean;
}) {
  const [raw, setRaw] = useState<number[]>([]);
  const tables = pages.reduce((n, page) => {
    const structure = page.structure ?? structureDocument(page.text);
    return (
      n +
      structure.sections.filter((s) => s.table).length +
      (structure.items.length ? 1 : 0)
    );
  }, 0);
  const words = pages.reduce(
    (n, page) => n + (page.text.match(/\S+/g)?.length ?? 0),
    0,
  );
  return (
    <section className="text-review">
      <div className="results-heading">
        <div>
          <span className="eyebrow">READ. REFINE. KEEP.</span>
          <h2>Your document, organized.</h2>
          <p>
            Review and edit the details, then save them in the format you need.
          </p>
        </div>
        <span className="local-badge">
          <ShieldCheck size={14} />
          On your device
        </span>
      </div>
      <div className="results-toolbar">
        <div className="result-stats">
          <span>
            <Files size={15} />
            {pages.length} {pages.length === 1 ? "page" : "pages"}
          </span>
          <span>
            <Type size={15} />
            {words.toLocaleString()} words
          </span>
          <span>
            <Table2 size={15} />
            {tables} tables
          </span>
        </div>
        <div className="export-actions" aria-label="Export document">
          <DownloadText
            text={formattedMarkdown(pages)}
            name="forma-document.md"
            label="Markdown"
          />
          <DownloadText
            text={receiptCsv(pages)}
            name="forma-document.csv"
            label="CSV"
            type="text/csv;charset=utf-8"
          />
          <DownloadText
            text={structuredJson(pages)}
            name="forma-document.json"
            label="JSON"
            type="application/json"
          />
          <DownloadText
            text={exportText(pages)}
            name="forma-extracted-text.txt"
            label="Text"
          />
        </div>
      </div>
      <fieldset disabled={disabled}>
        {pages.map((page) => {
          const structure = page.structure ?? structureDocument(page.text);
          return (
            <article className="text-page" key={page.page}>
              <div className="text-page-heading">
                <div className="page-label">
                  <strong>Page {page.page}</strong>
                  <span className="page-method">
                    {page.method === "ocr" ? "Scanned text" : "PDF text"}
                    {page.confidence !== undefined
                      ? ` · ${Math.round(page.confidence)}% confidence`
                      : ""}
                  </span>
                </div>
                <div
                  className="view-switch"
                  aria-label={`Page ${page.page} display`}
                >
                  <Button
                    variant="ghost"
                    aria-pressed={!raw.includes(page.page)}
                    onClick={() => setRaw(raw.filter((id) => id !== page.page))}
                  >
                    <LayoutList size={14} />
                    Formatted
                  </Button>
                  <Button
                    variant="ghost"
                    aria-pressed={raw.includes(page.page)}
                    onClick={() =>
                      setRaw([
                        ...raw.filter((id) => id !== page.page),
                        page.page,
                      ])
                    }
                  >
                    <AlignLeft size={14} />
                    Text
                  </Button>
                </div>
              </div>
              {raw.includes(page.page) ? (
                <div className="source-text">
                  <label htmlFor={`text-page-${page.page}`}>
                    Text from page {page.page}
                  </label>
                  <AutoTextarea
                    id={`text-page-${page.page}`}
                    dir="auto"
                    value={page.text}
                    maxLength={200000}
                    onChange={(e) =>
                      setPages(
                        pages.map((p) =>
                          p.page === page.page
                            ? {
                                ...p,
                                text: e.target.value,
                                structure: structureDocument(
                                  e.target.value,
                                  structure.kind === "receipt",
                                ),
                              }
                            : p,
                        ),
                      )
                    }
                  />
                </div>
              ) : structure.kind === "receipt" ? (
                <ReceiptView
                  value={structure}
                  page={page.page}
                  onChange={(value) =>
                    setPages(
                      pages.map((p) =>
                        p.page === page.page ? { ...p, structure: value } : p,
                      ),
                    )
                  }
                />
              ) : (
                <DocumentView
                  value={structure}
                  page={page.page}
                  onChange={(value) =>
                    setPages(
                      pages.map((p) =>
                        p.page === page.page ? { ...p, structure: value } : p,
                      ),
                    )
                  }
                />
              )}
            </article>
          );
        })}
      </fieldset>
    </section>
  );
}
