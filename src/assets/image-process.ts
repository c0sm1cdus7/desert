import { fork } from "node:child_process";
import { privateImageWorkLimits, cancelledAssetWork } from "./work.ts";
import type { ImageWorkerInput } from "./image-worker.ts";
import type { PrivateAssetMetadata } from "./types.ts";

export function runImageProcess(input: ImageWorkerInput, signal?: AbortSignal): Promise<PrivateAssetMetadata> {
  if (signal?.aborted) return Promise.reject(cancelledAssetWork());
  return new Promise((resolve, reject) => {
    const worker = fork(new URL("./image-worker.ts", import.meta.url), [], { execArgv: [], stdio: ["ignore", "ignore", "ignore", "ipc"] });
    let error: Error | undefined, metadata: PrivateAssetMetadata | undefined;
    const stop = (reason: Error) => { error ??= reason; worker.kill("SIGKILL"); };
    const cancel = () => stop(cancelledAssetWork());
    const timeout = setTimeout(() => stop(new Error("ASSET_PROCESSING_TIMEOUT")), privateImageWorkLimits.deadlineMs);
    const cleanup = () => { clearTimeout(timeout); signal?.removeEventListener("abort", cancel); };
    signal?.addEventListener("abort", cancel, { once: true });
    worker.once("message", (message: { metadata?: PrivateAssetMetadata; error?: string }) => {
      if (message.error) error = new Error(message.error);
      else metadata = message.metadata;
    });
    worker.once("error", cause => {
      if (worker.pid) stop(new Error("ASSET_PROCESSING_FAILED", { cause }));
      else { cleanup(); reject(new Error("ASSET_PROCESSING_FAILED", { cause })); }
    });
    worker.once("exit", code => {
      cleanup();
      if (error) reject(error);
      else if (code !== 0 || !metadata) reject(new Error("ASSET_PROCESSING_FAILED"));
      else resolve(metadata);
    });
    worker.send(input, cause => { if (cause) stop(new Error("ASSET_PROCESSING_FAILED", { cause })); });
    if (signal?.aborted) cancel();
  });
}
