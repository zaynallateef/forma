import { useState } from "react";
import { Pencil, Check } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { DocumentStructure } from "../types";
import { readingBlocks } from "../analysis/document";
import { AutoTextarea } from "./AutoTextarea";
export function Highlight({ text }: { text: string }) {
  const parts = text.split(
    /((?:[$€£]\s*\d[\d,.]*|\d[\d,.]*\s*(?:USD|JOD|EUR|GBP|SAR|AED|%)|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\b(?:must|do not|never|required|deadline|penalty)\b))/gi,
  );
  return (
    <>
      {parts.map((part, index) =>
        index % 2 ? <mark key={index}>{part}</mark> : part,
      )}
    </>
  );
}
export function DocumentView({
  value,
  onChange,
  page,
}: {
  value: DocumentStructure;
  onChange: (value: DocumentStructure) => void;
  page: number;
}) {
  const [editing, setEditing] = useState<number[]>([]);
  return (
    <div className="structured-document document-reading">
      <header className="document-title">
        <span className="eyebrow">EXTRACTED DOCUMENT</span>
        <h3 dir="auto">{value.title}</h3>
        <div className="document-metadata">
          <span>
            {value.sections.length}{" "}
            {value.sections.length === 1 ? "section" : "sections"}
          </span>
          <span>
            {value.sections.filter((section) => section.table).length} tables
          </span>
        </div>
      </header>
      {value.sections.map((section, index) => (
        <section className="document-section" key={index}>
          <div className="document-section-heading">
            <div>
              <span className="section-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h4 dir="auto">{section.heading}</h4>
            </div>
            {!section.table && (
              <Button
                variant="ghost"
                aria-label={`${editing.includes(index) ? "Done editing" : "Edit"} page ${page} section ${index + 1}`}
                onClick={() =>
                  setEditing(
                    editing.includes(index)
                      ? editing.filter((i) => i !== index)
                      : [...editing, index],
                  )
                }
              >
                {editing.includes(index) ? (
                  <Check size={14} />
                ) : (
                  <Pencil size={14} />
                )}
                <span>{editing.includes(index) ? "Done" : "Edit"}</span>
              </Button>
            )}
          </div>
          {section.table ? (
            <div
              className="receipt-table-scroll"
              tabIndex={0}
              aria-label={`Page ${page} ${section.heading} table`}
            >
              <table className="receipt-table">
                <caption className="sr-only">{section.heading}</caption>
                <thead>
                  <tr>
                    {section.table.headers.map((header, column) => (
                      <th key={column} scope="col">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, column) => (
                        <td key={column}>
                          <input
                            dir="auto"
                            aria-label={`Page ${page} table ${index + 1} row ${rowIndex + 1} column ${column + 1}`}
                            value={cell}
                            onChange={(e) =>
                              onChange({
                                ...value,
                                sections: value.sections.map((s, i) =>
                                  i === index && s.table
                                    ? {
                                        ...s,
                                        table: {
                                          ...s.table,
                                          rows: s.table.rows.map((r, ri) =>
                                            ri === rowIndex
                                              ? r.map((c, ci) =>
                                                  ci === column
                                                    ? e.target.value
                                                    : c,
                                                )
                                              : r,
                                          ),
                                        },
                                      }
                                    : s,
                                ),
                              })
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : editing.includes(index) ? (
            <AutoTextarea
              className="section-editor"
              dir="auto"
              aria-label={`Page ${page} section ${index + 1}`}
              value={section.text}
              onChange={(e) =>
                onChange({
                  ...value,
                  sections: value.sections.map((s, i) =>
                    i === index ? { ...s, text: e.target.value } : s,
                  ),
                })
              }
            />
          ) : (
            <div className="section-body" dir="auto">
              {readingBlocks(section.text).map((block, blockIndex) =>
                block.kind === "list" ? (
                  <ol className="reading-list" key={blockIndex}>
                    {block.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        <span className="list-marker">{item.marker}</span>
                        <div>
                          <Highlight text={item.text} />
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p
                    className={
                      block.kind === "note" ? "document-callout" : undefined
                    }
                    key={blockIndex}
                  >
                    <Highlight text={block.text} />
                  </p>
                ),
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
