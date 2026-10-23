import { privateImageTransferLimits } from "./host.ts";

export async function* imageByteStream(chunks: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, signal: AbortSignal) {
  const iterator = Symbol.asyncIterator in chunks ? chunks[Symbol.asyncIterator]() : chunks[Symbol.iterator]();
  try {
    while (true) {
      if (signal.aborted) throw new Error("ASSET_TRANSFER_CANCELLED");
      let cancel: () => void = () => {};
      let timer: ReturnType<typeof setTimeout> | undefined;
      const interrupted = new Promise<never>((_, reject) => {
        cancel = () => reject(new Error("ASSET_TRANSFER_CANCELLED"));
        signal.addEventListener("abort", cancel, { once: true });
        timer = setTimeout(() => reject(new Error("ASSET_TRANSFER_TIMEOUT")), privateImageTransferLimits.idleMs);
      });
      try {
        const next = await Promise.race([iterator.next(), interrupted]);
        if (next.done) return;
        if (!(next.value instanceof Uint8Array)) throw new Error("INVALID_ASSET_BYTES");
        yield next.value;
      } finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
    }
  } finally {
    // An untrusted source may never settle return(); it cannot keep the host lease alive.
    void Promise.resolve(iterator.return?.()).catch(() => {});
  }
}
