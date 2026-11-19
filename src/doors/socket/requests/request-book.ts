// The request key travels in the act's existing cause. Replaying the journal restores deduplication after a crash.
import { requestDigest } from "./public-message.ts";
import { ids } from "../../../house/ids.ts";
import type { Event } from "../../../journal/vocabulary.ts";
import type { RunningHouse } from "../../../runtime/house-runtime.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { RequestAct, ResultMessage, ServerMessage } from "../wire/protocol.ts";
import { jsonData } from "./json-data.ts";
import { requestContent } from "./request-content.ts";
export type RequestHouse<X extends Program> = Pick<RunningHouse<X>, "tools" | "journal" | "bus">;
type Saved = { content: string; id: string; effects: ResultMessage["efectos"]; result?: ResultMessage };
const legacyPrefix = "socket-request:";
/** The two causes of a socket act that name the door's request, not a fact: its key and its content's hash. */
export const requestCauses = [legacyPrefix, "socket-content:"] as const;
const prefix = `${requestCauses[0]}sha256:`;
const requestKey = (by: string, id: string) => `${prefix}${JSON.stringify([by, requestDigest(id)])}`;
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
      const key = event.cause.find(cause => cause.startsWith(prefix) || cause.startsWith(legacyPrefix));
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
export function requestBook<X extends Program>(house: RequestHouse<X>) {
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
    const saved = requests.get(requestKey(by, id)) ?? requests.get(`${legacyPrefix}${JSON.stringify([by, id])}`);
    return (
      saved && (saved.result ? { ...saved.result, id } : { tipo: "resultado", id, status: "processing", efectos: [] })
    );
  };
  return { act: actRequest(house, requests, lookup), lookup, stop };
}

function actRequest<X extends Program>(
  house: RequestHouse<X>,
  requests: Map<string, Saved>,
  lookup: (by: string, id: string) => ResultMessage | undefined,
) {
  const act = async (by: string, request: RequestAct, signal?: AbortSignal): Promise<ServerMessage> => {
    const { id } = request;
    if (signal?.aborted) return { tipo: "rechazo", id, motivo: socketTexts.unavailable };
    if (!jsonData(request)) return { tipo: "rechazo", id, motivo: socketTexts.invalidData };
    const content = requestFingerprint(request);
    const key = requestKey(by, id);
    const saved = requests.get(key) ?? requests.get(`${legacyPrefix}${JSON.stringify([by, id])}`);
    if (saved && saved.content !== content) return { tipo: "rechazo", id, motivo: socketTexts.reused };
    const previous = lookup(by, id);
    if (previous) return previous;
    requests.set(key, { id: key, content, effects: [] });
    let done: ResultMessage;
    try {
      const started = runRequest(house, by, request, [key, `socket-content:${content}`], signal);
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
    if (final) {
      const { private: _receipt, ...publicResult } = done;
      final.result = publicResult;
    }
    return done;
  };
  return act;
}

function runRequest<X extends Program>(
  house: RequestHouse<X>,
  by: string,
  request: RequestAct,
  cause: readonly string[],
  signal?: AbortSignal,
) {
  const { act, input, target, through, destination } = request;
  return house.tools.act(
    { act, input, ...(target ? { target } : {}), ...(destination ? { destination } : {}) },
    through,
    by,
    cause,
    signal,
  );
}

function requestFingerprint(request: RequestAct) {
  const { act, input, target, through, destination } = request;
  return requestContent({
    object: target ?? ids.self,
    option: act,
    input,
    through,
    ...(destination ? { destination } : {}),
  });
}
