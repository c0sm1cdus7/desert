// The request key travels in the act's existing cause. Replaying the journal restores deduplication after a crash.
import type { Event } from "../../journal/events.ts";
import type { RunningHouse } from "../../programs/house-runtime.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { RequestAct, ResultMessage } from "./protocol.ts";
type Saved = { id: string; effects: ResultMessage["efectos"]; result?: ResultMessage };
const prefix = "socket-request:";
const requestKey = (by: string, id: string) => `${prefix}${JSON.stringify([by, id])}`;
function receipt(event: Event): ResultMessage["efectos"] {
  if (event.layer !== "house") return [];
  if (event.kind === "act-done") {
    const { object, act, text } = event.data;
    return [{ layer: "house", kind: "act-done", data: { object, act, text }, by: event.by, cause: [] }];
  }
  if (event.kind !== "tool-entry") return [];
  const { tool, target, author, text } = event.data;
  return [{ layer: "house", kind: "tool-entry", data: { tool, target, author, text }, by: event.by, cause: [] }];
}
function history() {
  const requests = new Map<string, Saved>();
  const origins = new Map<string, Saved>();
  const record = (event: Event) => {
    if (event.layer === "house" && event.kind === "act") {
      const key = event.cause.find(cause => cause.startsWith(prefix));
      if (key) {
        const saved = { id: key, effects: [] };
        requests.set(key, saved);
        origins.set(event.id, saved);
      }
    }
    const saved = origins.get(event.cause[0] ?? "");
    if (!saved) return;
    saved.effects.push(...receipt(event));
    if (event.layer === "house" && event.kind === "act-result") {
      const { status, reason } = event.data;
      saved.result = { tipo: "resultado", id: "", status, ...(reason ? { reason } : {}), efectos: saved.effects };
    }
  };
  return { requests, record };
}
export function requestBook<X extends Program>(house: RunningHouse<X>) {
  const { requests, record } = history();
  house.journal.replay(null, (_, event) => {
    record(event);
    return null;
  });
  const stop = house.bus.on(record);
  const lookup = (by: string, id: string): ResultMessage | undefined => {
    const saved = requests.get(requestKey(by, id));
    return (
      saved && (saved.result ? { ...saved.result, id } : { tipo: "resultado", id, status: "processing", efectos: [] })
    );
  };
  const act = async (by: string, request: RequestAct): Promise<ResultMessage> => {
    const previous = lookup(by, request.id);
    if (previous) return previous;
    const key = requestKey(by, request.id);
    requests.set(key, { id: key, effects: [] });
    const { act, input, target, through, id } = request;
    const started = house.tools.act({ act, input, ...(target ? { target } : {}) }, through, by, [key]);
    const result = started.status === "processing" ? await started.completion : started;
    const answer = lookup(by, id) ?? { tipo: "resultado", id, status: result.status, efectos: [] };
    const done: ResultMessage = { ...answer, ...(result.private ? { private: result.private } : {}) };
    const saved = requests.get(key);
    if (saved) saved.result = done;
    return done;
  };
  return { act, lookup, stop };
}
