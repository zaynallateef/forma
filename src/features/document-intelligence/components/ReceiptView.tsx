import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { DocumentStructure, Field } from "../types";
import { AutoTextarea } from "./AutoTextarea";
const isTotal = (label: string) =>
  /^(?:grand\s+total|total(?:\s+due|\s+amount)?|amount\s+due|الإجمالي|الاجمالي|المجموع)(?:\s*$|\s*:)/i.test(
    label,
  );
function FieldTable({
  title,
  fields,
  page,
  onChange,
}: {
  title: string;
  fields: Field[];
  page: number;
  onChange: (fields: Field[]) => void;
}) {
  if (!fields.length) return null;
  return (
    <section className="receipt-section">
      <h4>{title}</h4>
      <dl className="receipt-details">
        {fields.map((field, index) => (
          <div
            key={index}
            className={isTotal(field.label) ? "receipt-grand-total" : undefined}
          >
            <dt>{field.label}</dt>
            <dd>
              <input
                dir="auto"
                aria-label={`Page ${page} ${field.label}`}
                value={field.value}
                onChange={(e) =>
                  onChange(
                    fields.map((f, i) =>
                      i === index ? { ...f, value: e.target.value } : f,
                    ),
                  )
                }
              />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function ReceiptView({
  value,
  onChange,
  page,
}: {
  value: DocumentStructure;
  onChange: (value: DocumentStructure) => void;
  page: number;
}) {
  const mainTotal = [...value.totals]
    .reverse()
    .find((field) => isTotal(field.label));
  return (
    <div className="structured-document receipt-document">
      <header className="receipt-heading">
        <div>
          <span className="eyebrow">RECEIPT</span>
          <h3 dir="auto">{value.title}</h3>
        </div>
        {mainTotal && (
          <div className="receipt-main-total">
            <span>{mainTotal.label}</span>
            <strong dir="auto">{mainTotal.value}</strong>
          </div>
        )}
      </header>
      <FieldTable
        title="Receipt details"
        fields={value.details}
        page={page}
        onChange={(details) =>
          onChange({
            ...value,
            details,
            title:
              details.find((field) => field.label === "Merchant")?.value ||
              value.title,
          })
        }
      />
      <section className="receipt-section">
        <div className="receipt-section-heading">
          <h4>Line items</h4>
          <Button
            variant="ghost"
            onClick={() =>
              onChange({
                ...value,
                items: [
                  ...value.items,
                  {
                    description: "",
                    quantity: "",
                    unitPrice: "",
                    amount: "",
                    source: "",
                  },
                ],
              })
            }
          >
            <Plus size={14} />
            Add item
          </Button>
        </div>
        {value.items.length > 0 && (
          <div
            className="receipt-table-scroll"
            tabIndex={0}
            aria-label={`Page ${page} line items table`}
          >
            <table className="receipt-table receipt-items">
              <caption className="sr-only">
                Receipt items on page {page}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Description</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Unit price</th>
                  <th scope="col">Amount</th>
                  <th scope="col">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {value.items.map((item, index) => (
                  <tr key={index}>
                    {(
                      [
                        "description",
                        "quantity",
                        "unitPrice",
                        "amount",
                      ] as const
                    ).map((key) => (
                      <td
                        key={key}
                        data-label={
                          {
                            description: "Description",
                            quantity: "Quantity",
                            unitPrice: "Unit price",
                            amount: "Amount",
                          }[key]
                        }
                      >
                        <input
                          dir="auto"
                          inputMode={key === "description" ? "text" : "decimal"}
                          aria-label={`Page ${page} item ${index + 1} ${key}`}
                          placeholder="—"
                          value={item[key]}
                          onChange={(e) =>
                            onChange({
                              ...value,
                              items: value.items.map((row, i) =>
                                i === index
                                  ? { ...row, [key]: e.target.value }
                                  : row,
                              ),
                            })
                          }
                        />
                      </td>
                    ))}
                    <td className="receipt-remove">
                      <Button
                        variant="ghost"
                        aria-label={`Remove item ${index + 1} from page ${page}`}
                        onClick={() =>
                          onChange({
                            ...value,
                            items: value.items.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <FieldTable
        title="Totals & payment"
        fields={value.totals}
        page={page}
        onChange={(totals) => onChange({ ...value, totals })}
      />
      {value.sections.map((section, index) => (
        <section key={index} className="receipt-section">
          <h4>{section.heading}</h4>
          <AutoTextarea
            className="receipt-note-editor"
            dir="auto"
            aria-label={`Page ${page} ${section.heading}`}
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
        </section>
      ))}
    </div>
  );
}
