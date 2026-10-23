/** Abandon a host response even when that host cannot cancel its underlying read. */
export function cancelOnAbort<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    const finish = () => signal.removeEventListener("abort", abort);
    try { work().then(value => { finish(); resolve(value); }, error => { finish(); reject(error); }); }
    catch (error) { finish(); reject(error); }
  });
}
