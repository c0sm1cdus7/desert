/** Bound browser reads below the host transfer limit. No bytes or authority are
 * cached: queued operations must still validate their session when executed. */
export function privateImageQueue(concurrency = 2, capacity = 512) {
  type Job = { run(): void; cancel(): void };
  const waiting: Job[] = [];
  let active = 0;
  function drain() {
    while (active < concurrency && waiting.length) waiting.shift()!.run();
  }
  return function schedule<T>(signal: AbortSignal, execute: () => Promise<T>): Promise<T> {
    if (signal.aborted) return Promise.reject(signal.reason);
    if (waiting.length >= capacity) return Promise.reject(new Error('ASSET_TRANSFER_BUSY'));
    return new Promise<T>((resolve, reject) => {
      const job: Job = {
        cancel() {
          const index = waiting.indexOf(job);
          if (index < 0) return;
          waiting.splice(index, 1); signal.removeEventListener('abort', job.cancel);
          reject(signal.reason);
        },
        run() {
          signal.removeEventListener('abort', job.cancel);
          if (signal.aborted) { reject(signal.reason); drain(); return; }
          active++;
          Promise.resolve().then(execute).then(resolve, reject).finally(() => { active--; drain(); });
        },
      };
      waiting.push(job); signal.addEventListener('abort', job.cancel, { once: true }); drain();
    });
  };
}

// Shared across read scopes in this browser, never a cross-identity byte cache.
export const schedulePrivateImageRead = privateImageQueue();

export function waitForPrivateImageCapacity(signal: AbortSignal, milliseconds: number) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
  });
}
