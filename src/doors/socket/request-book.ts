// The request key travels in the act's existing cause. Replaying the journal restores deduplication after a crash.
import { requestContent } from "./request-content.ts";
import { jsonData } from "./json-data.ts";
import { ids } from "../../catalogs/ids.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import type { Event } from "../../journal/events.ts";
import type { RunningHouse } from "../../programs/house-runtime.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { RequestAct, ResultMessage, ServerMessage } from "./protocol.ts";
type Saved = { content: string; id: string; effects: ResultMessage["efectos"]; result?: ResultMessage };
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
        const content =
          event.cause.find(cause => cause.startsWith("socket-content:"))?.slice(15) ?? requestContent(event.data);
        const saved = { id: key, content, effects: [] };
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
  // A durable request without a final result belongs to the stopped process, never to a live pending call.
  for (const saved of requests.values()) {
    if (!saved.result || (saved.result.status === "interrupted" && saved.result.reason === toolTexts.interrupted))
      saved.result = {
        tipo: "resultado",
        id: "",
        status: "interrupted",
        reason: socketTexts.interrupted,
        efectos: saved.effects,
      };
  }
  const stop = house.bus.on(record);
  const lookup = (by: string, id: string): ResultMessage | undefined => {
    const saved = requests.get(requestKey(by, id));
    return (
      saved && (saved.result ? { ...saved.result, id } : { tipo: "resultado", id, status: "processing", efectos: [] })
    );
  };
  return { act: actRequest(house, requests, lookup), lookup, stop };
}

function actRequest<X extends Program>(
  house: RunningHouse<X>,
  requests: Map<string, Saved>,
  lookup: (by: string, id: string) => ResultMessage | undefined,
) {
  const act = async (by: string, request: RequestAct): Promise<ServerMessage> => {
    const { act, input, target, through, id } = request;
    if (!jsonData(request)) return { tipo: "rechazo", id, motivo: socketTexts.invalidData };
    const content = requestContent({ object: target ?? ids.self, option: act, input, through });
    const key = requestKey(by, id);
    const saved = requests.get(key);
    if (saved && saved.content !== content) return { tipo: "rechazo", id, motivo: socketTexts.reused };
    const previous = lookup(by, id);
    if (previous) return previous;
    requests.set(key, { id: key, content, effects: [] });
    let done: ResultMessage;
    try {
      const started = house.tools.act({ act, input, ...(target ? { target } : {}) }, through, by, [
        key,
        `socket-content:${content}`,
      ]);
      const result = started.status === "processing" ? await started.completion : started;
      done = {
        tipo: "resultado",
        id,
        status: result.status,
        efectos: requests.get(key)?.effects ?? [],
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.private ? { private: result.private } : {}),
      };
    } catch {
      done = { tipo: "resultado", id, status: "interrupted", reason: socketTexts.interrupted, efectos: [] };
    }
    const final = requests.get(key);
    if (final) final.result = done;
    return done;
  };
  return act;
}
