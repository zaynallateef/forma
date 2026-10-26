import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  RotateCw,
  Trash2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { openPreview, renderPage, canvasBlob } from "../../lib/pdf/render";
import type { PageEdit } from "../../lib/pdf/operations";
import { Button } from "../ui/button";
function PageTile({
  edit,
  url,
  position,
  count,
  change,
  move,
  remove,
}: {
  edit: PageEdit;
  url?: string;
  position: number;
  count: number;
  change: () => void;
  move: (delta: number) => void;
  remove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: edit.index });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="page-tile"
    >
      <div className="tile-heading">
        <button
          className="drag-handle"
          aria-label={`Move page ${edit.index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <span>Page {edit.index + 1}</span>
      </div>
      <div className="thumbnail">
        {url ? (
          <img
            src={url}
            alt={`Page ${edit.index + 1} thumbnail`}
            style={{ transform: `rotate(${edit.rotation}deg)` }}
          />
        ) : (
          <span>Preview loading…</span>
        )}
      </div>
      <div className="tile-actions">
        <Button
          variant="ghost"
          aria-label={`Move page ${edit.index + 1} earlier`}
          disabled={!position}
          onClick={() => move(-1)}
        >
          <ArrowLeft size={14} />
        </Button>
        <Button
          variant="ghost"
          aria-label={`Rotate page ${edit.index + 1}`}
          onClick={change}
        >
          <RotateCw size={14} />
        </Button>
        <Button
          variant="ghost"
          aria-label={`Delete page ${edit.index + 1}`}
          disabled={count === 1}
          onClick={remove}
        >
          <Trash2 size={14} />
        </Button>
        <Button
          variant="ghost"
          aria-label={`Move page ${edit.index + 1} later`}
          disabled={position === count - 1}
          onClick={() => move(1)}
        >
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
export function PageGrid({
  bytes,
  edits,
  setEdits,
  editable = true,
}: {
  bytes: Uint8Array;
  edits: PageEdit[];
  setEdits: (edits: PageEdit[]) => void;
  editable?: boolean;
}) {
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [requestedBatch, setBatch] = useState(0);
  const batch = Math.min(
    requestedBatch,
    Math.max(0, Math.ceil(edits.length / 12) - 1),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const visible = edits.slice(batch * 12, batch * 12 + 12);
  const indices = visible.map((p) => p.index).join(",");
  useEffect(() => {
    let disposed = false;
    const created: string[] = [];
    const controller = new AbortController();
    async function load() {
      const pdf = await openPreview(bytes);
      try {
        for (const index of indices.split(",").filter(Boolean).map(Number)) {
          if (disposed) return;
          const page = await pdf.getPage(index + 1);
          const view = page.getViewport({ scale: 1 });
          const canvas = await renderPage(
            pdf,
            index + 1,
            Math.min(160 / view.width, 200 / view.height),
            controller.signal,
          );
          const blob = await canvasBlob(canvas, "image/png");
          canvas.width = 0;
          canvas.height = 0;
          const url = URL.createObjectURL(blob);
          created.push(url);
          if (!disposed) setUrls((old) => ({ ...old, [index]: url }));
        }
      } finally {
        await pdf.loadingTask.destroy();
      }
    }
    setUrls({});
    setError("");
    void load().catch(() => {
      if (!disposed)
        setError(
          "Some thumbnails could not be rendered. Use the main preview to inspect pages.",
        );
    });
    return () => {
      disposed = true;
      controller.abort();
      created.forEach(URL.revokeObjectURL);
    };
  }, [bytes, indices]);
  return (
    <section className="page-grid-section">
      <div className="preview-toolbar">
        <span>{editable ? "ARRANGE YOUR PAGES" : "PAGE THUMBNAILS"}</span>
        <span>{edits.length} pages</span>
      </div>
      {editable && (
        <p className="muted">
          Drag the handle or use the arrow buttons. Rotation and deletion apply
          to the exported PDF.
        </p>
      )}
      {error && <p role="status">{error}</p>}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id)
            setEdits(
              arrayMove(
                edits,
                edits.findIndex((p) => p.index === active.id),
                edits.findIndex((p) => p.index === over.id),
              ),
            );
        }}
      >
        <SortableContext
          items={visible.map((p) => p.index)}
          strategy={rectSortingStrategy}
        >
          <div className="page-grid">
            {visible.map((edit, i) =>
              editable ? (
                <PageTile
                  key={edit.index}
                  edit={edit}
                  url={urls[edit.index]}
                  position={batch * 12 + i}
                  count={edits.length}
                  change={() =>
                    setEdits(
                      edits.map((p) =>
                        p.index === edit.index
                          ? { ...p, rotation: (p.rotation + 90) % 360 }
                          : p,
                      ),
                    )
                  }
                  move={(delta) =>
                    setEdits(
                      arrayMove(edits, batch * 12 + i, batch * 12 + i + delta),
                    )
                  }
                  remove={() =>
                    setEdits(edits.filter((p) => p.index !== edit.index))
                  }
                />
              ) : (
                <div className="page-tile" key={edit.index}>
                  <div className="thumbnail">
                    {urls[edit.index] && (
                      <img
                        src={urls[edit.index]}
                        alt={`Page ${edit.index + 1}`}
                      />
                    )}
                  </div>
                  <span>Page {edit.index + 1}</span>
                </div>
              ),
            )}
          </div>
        </SortableContext>
      </DndContext>
      <div className="preview-pagination">
        <Button
          variant="ghost"
          disabled={batch === 0}
          onClick={() => setBatch((b) => b - 1)}
        >
          Previous
        </Button>
        <span>
          {batch + 1} / {Math.max(1, Math.ceil(edits.length / 12))}
        </span>
        <Button
          variant="ghost"
          disabled={(batch + 1) * 12 >= edits.length}
          onClick={() => setBatch((b) => b + 1)}
        >
          Next
        </Button>
      </div>
    </section>
  );
}
