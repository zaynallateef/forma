import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { openPreview, renderPage } from "../../lib/pdf/render";
import { Button } from "../ui/button";
export function PdfPreview({
  bytes,
  count,
}: {
  bytes: Uint8Array;
  count: number;
}) {
  const [page, setPage] = useState(1),
    [zoom, setZoom] = useState(1),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const target = holder.current;
    async function draw() {
      setBusy(true);
      setError("");
      const pdf = await openPreview(bytes);
      try {
        if (disposed) return;
        const canvas = await renderPage(pdf, page, zoom, controller.signal);
        if (!disposed) holder.current?.replaceChildren(canvas);
      } finally {
        await pdf.loadingTask.destroy();
      }
    }
    void draw()
      .catch((e) => {
        if (!disposed)
          setError(e instanceof Error ? e.message : "Preview unavailable.");
      })
      .finally(() => {
        if (!disposed) setBusy(false);
      });
    return () => {
      disposed = true;
      controller.abort();
      target?.replaceChildren();
    };
  }, [bytes, page, zoom]);
  return (
    <section className="preview-panel" aria-label="Document preview">
      <div className="preview-toolbar">
        <span>DOCUMENT PREVIEW</span>
        <div>
          <Button
            variant="ghost"
            aria-label="Zoom out"
            disabled={zoom <= 0.5}
            onClick={() => setZoom((z) => z - 0.25)}
          >
            <ZoomOut size={16} />
          </Button>
          <span>{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            aria-label="Zoom in"
            disabled={zoom >= 2}
            onClick={() => setZoom((z) => z + 0.25)}
          >
            <ZoomIn size={16} />
          </Button>
        </div>
      </div>
      <div className="preview-scroll" aria-busy={busy}>
        {busy && (
          <p className="preview-status" role="status">
            Rendering preview…
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div ref={holder} className="canvas-holder" />
      </div>
      <div className="preview-pagination">
        <Button
          variant="ghost"
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft size={18} />
        </Button>
        <span>
          Page {page} of {count}
        </span>
        <Button
          variant="ghost"
          aria-label="Next page"
          disabled={page === count}
          onClick={() => setPage((p) => p + 1)}
        >
          <ChevronRight size={18} />
        </Button>
      </div>
    </section>
  );
}
