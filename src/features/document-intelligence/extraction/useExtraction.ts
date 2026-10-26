import { useEffect, useRef, useState } from "react";
import { extractDocument } from "./extract";
import { detectFormat, validateFile } from "../../../lib/validation";
import type { ExtractOptions, ExtractionProgress, TextPage } from "../types";
export function useExtraction(initialLayout: "auto" | "receipt" = "auto") {
  const [file, setFile] = useState<File | null>(null),
    [pages, setPages] = useState<TextPage[]>([]),
    [options, setOptions] = useState<ExtractOptions>({
      language: "eng",
      mode: "auto",
      pages: "",
      layout: initialLayout,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState<ExtractionProgress>({ message: "" });
  const controller = useRef<AbortController | null>(null),
    mounted = useRef(true),
    lock = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  function clearResult() {
    setPages([]);
    setError("");
  }
  async function choose(files: File[]) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setProgress({ message: "Checking your document…" });
    try {
      const selected = files[0];
      const format = detectFormat(
        new Uint8Array(await selected.slice(0, 16).arrayBuffer()),
      );
      await validateFile(selected, format !== "pdf");
      if (mounted.current) {
        setFile(selected);
        clearResult();
      }
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "This document could not be opened.",
        );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function extract() {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy(true);
    clearResult();
    controller.current = new AbortController();
    const timer = setTimeout(() => controller.current?.abort(), 180_000);
    try {
      const extracted = await extractDocument(
        file,
        options,
        controller.current.signal,
        (p) => {
          if (mounted.current) setProgress(p);
        },
      );
      if (mounted.current) {
        setPages(extracted);
        if (!extracted.some((p) => p.text.trim()))
          setError(
            "No text found. Try OCR mode, a different language, or a clearer scan.",
          );
      }
    } catch (e) {
      if (mounted.current)
        setError(
          controller.current.signal.aborted
            ? "Extraction cancelled or exceeded three minutes. Try fewer pages."
            : e instanceof Error
              ? e.message
              : "Text extraction failed. Please try again.",
        );
    } finally {
      clearTimeout(timer);
      lock.current = false;
      if (mounted.current) {
        setBusy(false);
        setProgress({ message: "" });
      }
    }
  }
  return {
    file,
    pages,
    setPages,
    options,
    setOptions: (value: ExtractOptions) => {
      setOptions(value);
      clearResult();
    },
    busy,
    error,
    setError,
    progress,
    choose,
    extract,
    cancel: () => controller.current?.abort(),
    reset: () => {
      setFile(null);
      clearResult();
    },
  };
}
