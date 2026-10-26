import type { Job } from "./worker";
export function runJob<T extends number | Uint8Array>(
  job: Job,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Processing took too long. Try fewer pages or a smaller file.",
        ),
      );
    }, 60_000);
    const cleanup = () => {
      clearTimeout(timeout);
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new Error("Processing cancelled."));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({
      data,
    }: MessageEvent<{ result: T; error?: string }>) => {
      cleanup();
      if (data.error) reject(new Error(data.error));
      else resolve(data.result);
    };
    worker.onerror = () => {
      cleanup();
      reject(
        new Error("The processing worker failed. Try a smaller document."),
      );
    };
    try {
      worker.postMessage(job);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
