// Only the terminal session is implemented here. The agent door must supply its scene-aware session later.
import { effect } from "../../journal/events.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { socketTexts as said } from "../../texts/socket.texts.ts";
import type { ClientMessage, ServerMessage } from "./protocol.ts";
import type { Session } from "./door-session.ts";
import type { Peer } from "./socket-peer.ts";
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
  if (peer.key()?.door !== "terminal") return refusal;
  if (message.tipo === "acto") return book.act(by, message);
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
    const entry = house.tools.prepare({ ...message.entrada, author: by });
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
  return new Promise(resolve => {
    const seq = house.tools.state().through;
    const finish = () => {
      stop();
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      peer.stream.off("close", finish);
      resolve({
        tipo: "respuesta",
        id,
        seq: house.tools.state().through,
        datos: { cambio: house.tools.state().through > seq },
      });
    };
    const stop = house.bus.on(finish);
    const timer = setTimeout(finish, Math.min(240_000, Math.max(0, until - house.now())));
    signal.addEventListener("abort", finish, { once: true });
    peer.stream.once("close", finish);
  });
}
