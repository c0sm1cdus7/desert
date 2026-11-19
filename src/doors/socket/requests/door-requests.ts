// The socket serves terminal sessions; the HTTP agent door authenticates its own requests.
import { allowedAct } from "../../../house/kit.ts";
import { targetTool } from "../../../house/attendance.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import { effect } from "../../../house/facts.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { socketTexts as said } from "../../../texts/socket.texts.ts";
import type { ClientMessage, RequestAct, ServerMessage } from "../wire/protocol.ts";
import type { Session } from "./door-session.ts";
import type { Peer } from "../peers/socket-peer.ts";
import { houseChange } from "./house-change.ts";
import { jsonData } from "./json-data.ts";
export async function routeRequest<X extends Program>(
  session: Session<X>,
  peer: Peer,
  message: ClientMessage,
): Promise<ServerMessage> {
  const { house, book } = session;
  const by = peer.key()?.identity ?? "";
  const refusal = {
    tipo: "rechazo",
    motivo: said.unavailable,
    ...("id" in message ? { id: message.id } : {}),
  } as const;
  if (message.tipo === "acto") return credentialAct(session, peer, message);
  if (!jsonData(message)) return { ...refusal, motivo: said.invalidData };
  if (message.tipo === "leer") {
    if (message.qué === "pedido") return book.lookup(by, message.id) ?? { ...refusal, motivo: said.unknown };
    if (message.qué === "catalogo")
      return {
        tipo: "respuesta",
        id: message.id,
        seq: house.tools.state().through,
        datos: house.registry.map(tool => ({ id: tool.id, purpose: tool.purpose, acts: Object.keys(tool.acts) })),
      };
  }
  if (message.tipo === "esperar") return waitForChange(session, peer, message.id, message.hasta);
  if (message.tipo === "defecto") {
    const { tool, target, option } = message;
    const state = house.tools.state();
    const declared = targetTool(house.registry, state, target);
    const action = declared && Object.hasOwn(declared.acts, option) ? declared.acts[option] : undefined;
    const wrongPlace = action?.on !== undefined && (action.on === "tool") !== (target === tool);
    if (declared?.id !== tool || !action || wrongPlace) return { ...refusal, motivo: toolTexts.unknown };
    if (!allowedAct(state.house, by, tool, option)) return { ...refusal, motivo: toolTexts.kitRefusal(tool) };
    const entry = house.tools.prepare({ tool, target, author: by, text: toolTexts.baseFailure });
    house.bus.emit(effect("tool-entry", entry, by));
    return { tipo: "respuesta", id: "defecto", seq: house.tools.state().through, datos: null };
  }
  return refusal;
}
function waitForChange<X extends Program>(
  { house, signal }: Session<X>,
  peer: Peer,
  id: string,
  until: number,
): Promise<ServerMessage> {
  const disconnected = new AbortController();
  const close = () => disconnected.abort();
  peer.stream.once("close", close);
  const waiting = houseChange(
    () => house.tools.state().through,
    changed => house.bus.on(changed),
    house.tools.state().through,
    Math.min(240_000, Math.max(0, until - house.now())),
    AbortSignal.any([signal, disconnected.signal]),
  );
  return waiting.then(({ seq, cambio }) => {
    peer.stream.off("close", close);
    return { tipo: "respuesta", id, seq, datos: { cambio } };
  });
}

/** A lost connection does not revoke a credential; keep watching its pending act until completion. */
async function credentialAct<X extends Program>(session: Session<X>, peer: Peer, message: RequestAct) {
  const { house, book, signal } = session;
  const key = peer.key();
  const controller = new AbortController();
  const check = () => {
    const current = house.tools.state().house;
    if (!key?.id || current.doors.keys.get(key.id)?.revoked !== false || !current.grants.has(key.identity))
      controller.abort();
  };
  const stop = house.bus.on(check);
  if (signal.aborted) controller.abort();
  check();
  try {
    // Shutdown refuses new requests, but an accepted act retains its credential while the house drains.
    return await book.act(key?.identity ?? "", message, controller.signal);
  } finally {
    stop();
    controller.abort();
  }
}
