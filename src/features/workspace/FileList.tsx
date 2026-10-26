import { ArrowUp, ArrowDown, X, FileText } from "lucide-react";
import type { LoadedFile } from "./processing";
import { Button } from "../../components/ui/button";
export function FileList({
  files,
  setFiles,
}: {
  files: LoadedFile[];
  setFiles: (files: LoadedFile[]) => void;
}) {
  function move(index: number, delta: number) {
    const next = [...files];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setFiles(next);
  }
  return (
    <div className="file-list">
      {files.map((item, i) => (
        <div className="file-row" key={item.id}>
          {item.url ? (
            <img src={item.url} alt="" />
          ) : (
            <span className="file-symbol">
              <FileText size={21} />
            </span>
          )}
          <div className="file-info">
            <strong>{item.file.name}</strong>
            <span>
              {(item.file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
              {item.format === "pdf"
                ? `${item.count} pages`
                : `${item.width} × ${item.height} px`}
            </span>
          </div>
          <div className="file-actions">
            {files.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  aria-label={`Move ${item.file.name} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={15} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Move ${item.file.name} down`}
                  disabled={i === files.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={15} />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              aria-label={`Remove ${item.file.name}`}
              onClick={() => setFiles(files.filter((f) => f.id !== item.id))}
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
