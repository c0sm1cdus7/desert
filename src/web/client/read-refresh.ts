import { cancelOnAbort } from "./cancellation.ts";

const ConnectedReadIntervalMs = 1000;
type Pass = { abort: AbortController; queued: boolean; promise: Promise<void> };

/** Connection observations schedule reads; they never introduce a second timer or operation replay. */
export function readRefresh(work: (signal: AbortSignal) => Promise<void>, eligible: () => boolean,
  clock: () => number = () => performance.now()) {
  let running: Pass | undefined, stopped = false, completedAt = -Infinity;
  async function drain(pass: Pass) {
    try {
      do {
        pass.queued = false;
        if (stopped || pass.abort.signal.aborted || !eligible()) return;
        await cancelOnAbort(pass.abort.signal, () => work(pass.abort.signal));
        if (!pass.abort.signal.aborted) completedAt = clock();
      } while (pass.queued);
    } catch (error) { if (!pass.abort.signal.aborted) throw error; }
    finally { if (running === pass) running = undefined; }
  }
  function invalidate() {
    const previous = running;
    running = undefined;
    if (previous) { previous.queued = false; previous.abort.abort(); }
  }
  function request(): Promise<void> {
    if (stopped || !eligible()) return Promise.resolve();
    if (running) { running.queued = true; return running.promise; }
    const pass: Pass = { abort: new AbortController(), queued: false, promise: Promise.resolve() };
    running = pass;
    return pass.promise = Promise.resolve().then(() => drain(pass));
  }
  return {
    request, invalidate,
    observe() { if (!running && clock() - completedAt >= ConnectedReadIntervalMs) void request(); },
    stop() { stopped = true; invalidate(); },
  };
}
