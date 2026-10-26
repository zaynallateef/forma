import { useSearchParams } from "react-router-dom";
import { ArrowRight, ShieldCheck, LoaderCircle } from "lucide-react";
import { Dropzone } from "../../components/upload/Dropzone";
import { Button } from "../../components/ui/button";
import { useExtraction } from "./extraction/useExtraction";
import { TextReview } from "./components/TextReview";
import type { ExtractOptions } from "./types";
import "./studio.css";
export default function IntelligencePage() {
  const [params] = useSearchParams();
  const state = useExtraction(
    params.get("tool") === "receipts" ? "receipt" : "auto",
  );
  return (
    <section className="wrap page-section intelligence-page">
      <span className="eyebrow">A CLEARER PICTURE OF YOUR DOCUMENTS</span>
      <h1>
        See the <em>details.</em>
      </h1>
      <p className="page-description">
        Read scans, organize receipts, and find the important parts. All on your
        device.
      </p>
      <div className="ocr-workspace">
        <div>
          <fieldset disabled={state.busy} className="extraction-inputs">
            <Dropzone
              home
              multiple={false}
              disabled={state.busy}
              onFiles={state.choose}
              onError={state.setError}
            />
            {state.file && (
              <div className="intelligence-file">
                <div>
                  <strong>{state.file.name}</strong>
                  <p className="muted">
                    {(state.file.size / 1024 / 1024).toFixed(2)} MB · PDF, PNG,
                    JPG, or WebP · Select up to 10 pages
                  </p>
                </div>
                <Button variant="ghost" onClick={state.reset}>
                  Remove
                </Button>
              </div>
            )}
            <div className="extraction-settings settings-fields">
              <label>
                Document layout
                <select
                  value={state.options.layout ?? "auto"}
                  onChange={(e) =>
                    state.setOptions({
                      ...state.options,
                      layout: e.target.value as "auto" | "receipt",
                    })
                  }
                >
                  <option value="auto">Automatic</option>
                  <option value="receipt">Receipt / invoice</option>
                </select>
              </label>
              <label>
                Reading method
                <select
                  value={state.options.mode}
                  onChange={(e) =>
                    state.setOptions({
                      ...state.options,
                      mode: e.target.value as ExtractOptions["mode"],
                    })
                  }
                >
                  <option value="auto">Auto · PDF text, OCR for scans</option>
                  <option value="ocr">
                    OCR · Recognize every selected page
                  </option>
                  <option value="text">PDF text layer only · Fastest</option>
                </select>
              </label>
              <label>
                Recognition language
                <select
                  value={state.options.language}
                  onChange={(e) =>
                    state.setOptions({
                      ...state.options,
                      language: e.target.value as ExtractOptions["language"],
                    })
                  }
                >
                  <option value="eng">English</option>
                  <option value="ara">Arabic</option>
                  <option value="eng+ara">English + Arabic</option>
                </select>
              </label>
              <label>
                Pages to read
                <input
                  value={state.options.pages}
                  placeholder="All pages, or 1, 3-5"
                  onChange={(e) =>
                    state.setOptions({
                      ...state.options,
                      pages: e.target.value,
                    })
                  }
                />
                <small>
                  Up to 10 selected pages per extraction. Images use page 1.
                </small>
              </label>
            </div>
          </fieldset>
          <p className="local-note">
            <ShieldCheck size={16} />
            Extraction runs locally. Recognition models load from this website
            only.
          </p>
          {state.error && (
            <p role="alert" className="error">
              {state.error}
            </p>
          )}
          {state.busy ? (
            <div className="processing" role="status">
              <LoaderCircle className="spin" size={21} />
              <p>{state.progress.message}</p>
              {state.progress.fraction !== undefined && (
                <progress
                  aria-label="Current OCR page progress"
                  max={1}
                  value={state.progress.fraction}
                />
              )}
              <Button variant="secondary" onClick={state.cancel}>
                Cancel extraction
              </Button>
            </div>
          ) : (
            <Button disabled={!state.file} onClick={state.extract}>
              Read document <ArrowRight size={16} />
            </Button>
          )}
          {state.pages.length > 0 && (
            <div id="results">
              <TextReview
                pages={state.pages}
                setPages={state.setPages}
                disabled={state.busy}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
