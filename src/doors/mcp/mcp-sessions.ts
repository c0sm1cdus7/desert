// Abort open HTTP work as soon as its live credential is revoked, with one house subscription.
export function mcpSessions(watch: (changed: () => void) => () => void) {
  const sessions = new Map<AbortController, () => boolean>();
  const stop = watch(() => {
    for (const [controller, authorized] of sessions) if (!authorized()) controller.abort();
  });
  return {
    track: (controller: AbortController, authorized: () => boolean) => {
      sessions.set(controller, authorized);
      return () => {
        sessions.delete(controller);
      };
    },
    close() {
      stop();
      for (const controller of sessions.keys()) controller.abort();
      sessions.clear();
    },
  };
}

/** Complete a revoked request even while its peer has stopped sending body bytes. */
export function abortableResponse<T>(work: Promise<T>, signal: AbortSignal, fallback: () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      resolve(fallback());
    };
    signal.addEventListener("abort", abort, { once: true });
    void work.then(
      value => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error instanceof Error ? error : new Error("MCP work failed"));
      },
    );
    if (signal.aborted) abort();
  });
}
