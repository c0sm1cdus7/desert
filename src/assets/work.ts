type Job = { start(): void; cancel(): void };
type Queue = { active: boolean; waiting: Job[] };
const queues = new Map<string, Queue>();
export const privateImageWorkLimits = Object.freeze({ active: 1, waiting: 2, deadlineMs: 30_000 });
export const cancelledAssetWork = () => new Error("ASSET_PROCESSING_CANCELLED");

export function privateImageWork<T>(store: string, operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(cancelledAssetWork());
  const queue = queues.get(store) ?? { active: false, waiting: [] };
  queues.set(store, queue);
  if (queue.active && queue.waiting.length >= privateImageWorkLimits.waiting) return Promise.reject(new Error("ASSET_PROCESSOR_BUSY"));
  return new Promise((resolve, reject) => {
    const job: Job = {
      cancel() {
        const index = queue.waiting.indexOf(job);
        if (index >= 0) { queue.waiting.splice(index, 1); reject(cancelledAssetWork()); }
      },
      start() {
        signal?.removeEventListener("abort", job.cancel);
        queue.active = true;
        let completed: Promise<T>;
        try { completed = signal?.aborted ? Promise.reject(cancelledAssetWork()) : operation(); }
        catch (error) { completed = Promise.reject(error); }
        completed.then(resolve, reject).finally(() => {
          const next = queue.waiting.shift();
          if (next) next.start();
          else { queue.active = false; queues.delete(store); }
        });
      },
    };
    if (!queue.active) job.start();
    else { queue.waiting.push(job); signal?.addEventListener("abort", job.cancel, { once: true }); }
  });
}
