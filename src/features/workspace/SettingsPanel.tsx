import type { Settings } from "./processing";
import { isImageTool } from "../../lib/tools";
export function SettingsPanel({
  id,
  settings,
  setSettings,
  count,
}: {
  id: string;
  settings: Settings;
  setSettings: (s: Settings) => void;
  count: number;
}) {
  const update = (value: Partial<Settings>) =>
    setSettings({ ...settings, ...value });
  const selecting = [
    "pdf-to-png",
    "pdf-to-jpg",
    "split-pdf",
    "extract-pages",
  ].includes(id);
  return (
    <div className="settings-fields">
      {selecting && (
        <label>
          Pages to export
          <input
            value={settings.pages}
            placeholder="All pages"
            onChange={(e) => update({ pages: e.target.value })}
          />
          <small>Leave empty for all {count} pages, or enter 1, 3-5.</small>
        </label>
      )}
      {id.startsWith("pdf-to-") && (
        <>
          <label>
            Resolution
            <select
              value={settings.scale}
              onChange={(e) => update({ scale: Number(e.target.value) })}
            >
              <option value={1}>Standard · 72 DPI</option>
              <option value={2}>High · 144 DPI</option>
              <option value={3}>Print · 216 DPI</option>
            </select>
          </label>
          {id === "pdf-to-jpg" && (
            <label>
              JPG quality · {Math.round(settings.quality * 100)}%
              <input
                type="range"
                min=".3"
                max="1"
                step=".05"
                value={settings.quality}
                onChange={(e) => update({ quality: Number(e.target.value) })}
              />
            </label>
          )}
          <p className="muted">Multiple pages are bundled into a ZIP file.</p>
        </>
      )}
      {isImageTool(id) && (
        <>
          <label>
            Page size
            <select
              value={settings.size}
              onChange={(e) =>
                update({ size: e.target.value as Settings["size"] })
              }
            >
              <option>A4</option>
              <option>Letter</option>
            </select>
          </label>
          <label>
            Orientation
            <select
              value={String(settings.landscape)}
              onChange={(e) => update({ landscape: e.target.value === "true" })}
            >
              <option value="false">Portrait</option>
              <option value="true">Landscape</option>
            </select>
          </label>
          <label>
            Margins
            <select
              value={settings.margin}
              onChange={(e) => update({ margin: Number(e.target.value) })}
            >
              <option value={0}>None</option>
              <option value={18}>Small · ¼ inch</option>
              <option value={36}>Medium · ½ inch</option>
              <option value={72}>Large · 1 inch</option>
            </select>
          </label>
          <p className="muted">
            Images keep their proportions and are centered on each page.
          </p>
        </>
      )}
      {["split-pdf", "extract-pages"].includes(id) && (
        <label>
          Output
          <select
            aria-label="Output"
            value={String(settings.separate)}
            onChange={(e) => update({ separate: e.target.value === "true" })}
          >
            <option value="false">One PDF with selected pages</option>
            <option value="true">Individual PDFs (ZIP)</option>
          </select>
        </label>
      )}
    </div>
  );
}
