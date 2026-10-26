import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  CheckCircle2,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import { tools, isImageTool, isOrganizeTool } from "../lib/tools";
import { validateFile, MAX_TOTAL_BYTES, MAX_PAGES } from "../lib/validation";
import { runJob } from "../lib/pdf/client";
import type { PageEdit } from "../lib/pdf/operations";
import {
  processFiles,
  type LoadedFile,
  type Settings,
} from "../features/workspace/processing";
import { SettingsPanel } from "../features/workspace/SettingsPanel";
import { FileList } from "../features/workspace/FileList";
import { Dropzone } from "../components/upload/Dropzone";
import { PdfPreview } from "../components/preview/PdfPreview";
import { PageGrid } from "../components/preview/PageGrid";
import { Button } from "../components/ui/button";
const defaults: Settings = {
  pages: "",
  scale: 2,
  quality: 0.9,
  separate: false,
  size: "A4",
  landscape: false,
  margin: 36,
};
export default function Workspace({
  pending,
  clearPending,
}: {
  pending: File[];
  clearPending: () => void;
}) {
  const { id = "" } = useParams();
  const tool = tools.find((t) => t.id === id);
  const [files, setFiles] = useState<LoadedFile[]>([]),
    [edits, setEdits] = useState<PageEdit[]>([]),
    [settings, setSettings] = useState(defaults);
  const [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{
      url: string;
      name: string;
      size: number;
    } | null>(null);
  const controller = useRef<AbortController | null>(null),
    lock = useRef(false),
    alive = useRef(true),
    urls = useRef(new Set<string>());
  const images = isImageTool(id),
    organize = isOrganizeTool(id),
    multiple = images || id === "merge-pdf";
  const total = files.reduce((n, f) => n + f.count, 0);
  function invalidate() {
    setResult(null);
    setError("");
  }
  function updateFiles(next: LoadedFile[]) {
    files
      .filter((f) => !next.includes(f) && f.url)
      .forEach((f) => {
        URL.revokeObjectURL(f.url!);
        urls.current.delete(f.url!);
      });
    setFiles(next);
    invalidate();
    if (!multiple)
      setEdits(
        next[0]
          ? Array.from({ length: next[0].count }, (_, index) => ({
              index,
              rotation: 0,
            }))
          : [],
      );
  }
  async function addFiles(incoming: File[]) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setStatus("Checking your files…");
    controller.current = new AbortController();
    const added: LoadedFile[] = [];
    try {
      const existing = multiple ? files : [];
      if (existing.length + incoming.length > MAX_PAGES)
        throw new Error("Choose at most 150 files.");
      let totalPixels = existing.reduce(
        (n, file) => n + (file.width ?? 0) * (file.height ?? 0),
        0,
      );
      if (
        existing.reduce((n, f) => n + f.file.size, 0) +
          incoming.reduce((n, f) => n + f.size, 0) >
        MAX_TOTAL_BYTES
      )
        throw new Error("Choose files totaling no more than 50 MB.");
      for (const file of incoming) {
        controller.current.signal.throwIfAborted();
        const format = await validateFile(file, images);
        const bytes = new Uint8Array(await file.arrayBuffer());
        let count = 1,
          width: number | undefined,
          height: number | undefined,
          url: string | undefined;
        if (format === "pdf")
          count = await runJob<number>(
            { type: "inspect", bytes },
            controller.current.signal,
          );
        else {
          const bitmap = await createImageBitmap(file);
          width = bitmap.width;
          height = bitmap.height;
          bitmap.close();
          if (width * height > 16_000_000)
            throw new Error("Images must be no larger than 16 megapixels.");
          totalPixels += width * height;
          if (totalPixels > 32_000_000)
            throw new Error(
              "Choose images totaling no more than 32 megapixels.",
            );
          url = URL.createObjectURL(file);
          urls.current.add(url);
        }
        added.push({
          id: crypto.randomUUID(),
          file,
          bytes,
          count,
          width,
          height,
          url,
          format,
        });
      }
      if ([...existing, ...added].reduce((n, f) => n + f.count, 0) > MAX_PAGES)
        throw new Error("Choose at most 150 pages or images in total.");
      controller.current.signal.throwIfAborted();
      if (alive.current) updateFiles([...existing, ...added]);
    } catch (e) {
      added.forEach((f) => {
        if (f.url) {
          URL.revokeObjectURL(f.url);
          urls.current.delete(f.url);
        }
      });
      if (alive.current)
        setError(e instanceof Error ? e.message : "Unable to read this file.");
    } finally {
      lock.current = false;
      if (alive.current) {
        setBusy(false);
        setStatus("");
      }
    }
  }
  useEffect(() => {
    alive.current = true;
    const ownedUrls = urls.current;
    return () => {
      alive.current = false;
      controller.current?.abort();
      ownedUrls.forEach(URL.revokeObjectURL);
    };
  }, []);
  useEffect(() => {
    if (pending.length) {
      void addFiles(pending);
      clearPending();
    } /* Consume files only when this workspace mounts. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result.url);
    },
    [result],
  );
  async function process() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    setStatus("Processing on your device…");
    controller.current = new AbortController();
    try {
      const output = await processFiles(
        id,
        files,
        settings,
        edits,
        controller.current.signal,
        (s) => {
          if (alive.current) setStatus(s);
        },
      );
      controller.current.signal.throwIfAborted();
      if (alive.current)
        setResult({
          url: URL.createObjectURL(output.blob),
          name: output.name,
          size: output.blob.size,
        });
    } catch (e) {
      if (alive.current)
        setError(
          controller.current.signal.aborted
            ? "Processing cancelled. Your original files are unchanged."
            : e instanceof Error
              ? e.message
              : "Processing failed. Please try again.",
        );
    } finally {
      lock.current = false;
      if (alive.current) {
        setBusy(false);
        setStatus("");
      }
    }
  }
  if (!tool || tool.category === "Read & extract")
    return (
      <section className="wrap page-section">
        <h1>Tool not found.</h1>
        <Link to="/tools">Explore all tools</Link>
      </section>
    );
  const Icon = tool.icon;
  return (
    <section className="wrap page-section workspace">
      <Link className="text-link" to="/tools">
        <ArrowLeft size={16} /> All tools
      </Link>
      <div className="workspace-title">
        <span className={`tool-icon ${tool.tone}`}>
          <Icon size={28} />
        </span>
        <div>
          <h1>{tool.name}</h1>
          <p>{tool.description} All processing stays on your device.</p>
        </div>
      </div>
      <div className="workflow-steps">
        <span className="current">
          01 <b>Add your files</b>
        </span>
        <ArrowRight size={14} />
        <span className={files.length ? "current" : ""}>
          02 <b>Make it yours</b>
        </span>
        <ArrowRight size={14} />
        <span className={result ? "current" : ""}>
          03 <b>Download & done</b>
        </span>
      </div>
      <div className="workspace-layout">
        <div>
          <fieldset disabled={busy} className="workspace-fieldset">
            <Dropzone
              images={images}
              multiple={multiple}
              disabled={busy}
              onFiles={addFiles}
              onError={setError}
            />
            <FileList files={files} setFiles={updateFiles} />
            {files[0]?.format === "pdf" && (
              <>
                <PdfPreview
                  key={`preview-${files[0].id}`}
                  bytes={files[0].bytes}
                  count={files[0].count}
                />
                {id !== "merge-pdf" && (
                  <PageGrid
                    key={`grid-${files[0].id}`}
                    bytes={files[0].bytes}
                    edits={edits}
                    setEdits={(value) => {
                      setEdits(value);
                      invalidate();
                    }}
                    editable={organize}
                  />
                )}
              </>
            )}
            {images && files.length > 0 && (
              <div className="image-gallery">
                {files.map((file) => (
                  <figure key={file.id}>
                    <img src={file.url} alt={file.file.name} />
                    <figcaption>{file.file.name}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </fieldset>
        </div>
        <aside className="settings-panel">
          <span className="eyebrow">THE FINISHING TOUCHES</span>
          <h2>Make it yours.</h2>
          <p className="muted">
            {files.length
              ? `${files.length} ${files.length === 1 ? "file" : "files"} · ${total} ${images ? "images" : "pages"}`
              : "Add a file to get started."}
          </p>
          <fieldset disabled={busy}>
            <SettingsPanel
              id={id}
              settings={settings}
              setSettings={(value) => {
                setSettings(value);
                invalidate();
              }}
              count={files[0]?.count ?? 0}
            />
          </fieldset>
          {organize && (
            <p className="muted">
              {edits.length} pages will be exported in the order shown. Use the
              page controls to rotate, remove, or move them.
            </p>
          )}
          {id === "merge-pdf" && (
            <p className="muted">
              Files are merged from top to bottom. Use the arrows to change
              their order.
            </p>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {busy ? (
            <div role="status" className="processing">
              <LoaderCircle className="spin" size={20} />
              <p>{status}</p>
              <Button
                variant="secondary"
                onClick={() => controller.current?.abort()}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              className="full-width"
              onClick={process}
              disabled={
                !files.length || (id === "merge-pdf" && files.length < 2)
              }
            >
              {error
                ? "Try again"
                : "Create " +
                  (id === "pdf-to-png"
                    ? "PNG"
                    : id === "pdf-to-jpg"
                      ? "JPG"
                      : "PDF")}
              <ArrowRight size={16} />
            </Button>
          )}
          {result && (
            <div className="success" role="status">
              <CheckCircle2 size={22} />
              <h3>All done. All yours.</h3>
              <p>
                {result.name} · {(result.size / 1024).toFixed(1)} KB
              </p>
              <Button asChild>
                <a href={result.url} download={result.name}>
                  <Download size={16} />
                  Download result
                </a>
              </Button>
            </div>
          )}
          <p className="local-note">
            <ShieldCheck size={16} /> On your device. Off the cloud.
          </p>
          {files.length > 0 && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                updateFiles([]);
                setSettings(defaults);
              }}
            >
              Clear workspace
            </Button>
          )}
        </aside>
      </div>
    </section>
  );
}
