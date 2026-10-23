import { TransportError, type ControllerTransport } from "./transport.ts";
import { cancelOnAbort } from "./cancellation.ts";
import type { ApiMethods } from "../types.ts";

export function readRequest<K extends "begin" | "read" | "offer">(transport: ControllerTransport,
  signal: AbortSignal, method: K, input: ApiMethods[K]["input"]) {
  return cancelOnAbort(signal, () => transport.call(method, input, { signal }));
}

/** Two admitted runs, never cached facts. Each read still reauthenticates and revalidates its source. */
export function readRuns(transport: ControllerTransport, journeyId: string) {
  let collection: string | undefined, selected: { subject: string; id: string } | undefined;
  let generation = 0;
  return {
    async read(subject?: string, signal = new AbortController().signal) {
      const started = generation;
      let id = subject === undefined ? collection : selected?.subject === subject ? selected.id : undefined;
      if (!id) {
        id = (await readRequest(transport, signal, "begin", { journeyId, ...(subject ? { subject } : {}) })).id;
        if (started !== generation || signal.aborted) throw new TransportError("READ_CANCELLED");
        if (subject === undefined) collection = id; else selected = { subject, id };
      }
      return readRequest(transport, signal, "read", { runId: id });
    },
    clear() { generation++; collection = undefined; selected = undefined; },
  };
}
