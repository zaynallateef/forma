import { useDropzone } from "react-dropzone";
import { Upload, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";
export function Dropzone({
  onFiles,
  disabled = false,
  images = false,
  multiple = true,
  home = false,
  onError,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  images?: boolean;
  multiple?: boolean;
  home?: boolean;
  onError: (error: string) => void;
}) {
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    multiple,
    disabled,
    maxSize: 20 * 1024 * 1024,
    accept: home
      ? undefined
      : images
        ? {
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/webp": [".webp"],
          }
        : { "application/pdf": [".pdf"] },
    onDropAccepted: onFiles,
    onDropRejected: () =>
      onError(
        "Choose a supported file, up to 20 MB each. This tool may accept only one file at a time.",
      ),
  });
  return (
    <div
      {...getRootProps({
        className: `dropzone ${isDragActive ? "drag-active" : ""} ${home ? "home-dropzone" : ""}`,
      })}
    >
      <input {...getInputProps({ "aria-label": "Upload documents" })} />
      <div className="upload-icon">
        <Upload size={26} strokeWidth={1.5} />
      </div>
      <h2>
        {isDragActive
          ? "Drop it here."
          : home
            ? "A fresh start for your files."
            : "Drop your files here"}
      </h2>
      <p>
        {home
          ? "Drag & drop your documents here, or browse to begin."
          : "Everything is processed right here in your browser."}
      </p>
      <Button type="button" onClick={open} disabled={disabled}>
        Browse files <ArrowUpRight size={17} />
      </Button>
      <span className="supported">
        {home
          ? "PDF, PNG, JPG, WebP"
          : images
            ? "PNG, JPG, WebP"
            : "PDF documents"}{" "}
        <span>·</span> Up to 20 MB per file
      </span>
      {home && (
        <div className="dropzone-privacy">
          <ShieldCheck size={14} /> Your files stay on your device. Always in
          your control.
        </div>
      )}
    </div>
  );
}
