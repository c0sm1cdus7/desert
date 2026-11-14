// Session controls are available only after hello; every later response checks current membership again.
import { houseProtocolVersion } from "../../catalogs/levers.ts";
import type { RunningHouse } from "../../programs/house-runtime.ts";
import { mindTool, present } from "../../house/house.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { socketTexts as said } from "../../texts/socket.texts.ts";
import type { ClientMessage } from "./protocol.ts";
import { helloFailure, type DoorKey, type Peer } from "./socket-peer.ts";
import type { requestBook } from "./request-book.ts";
import type { stateDelivery } from "./state-delivery.ts";
import { routeRequest } from "./door-requests.ts";
export type Session<X extends Program> = Readonly<{
  house: RunningHouse<X>;
  keys: ReadonlyMap<string, DoorKey>;
  book: ReturnType<typeof requestBook<X>>;
  delivery: ReturnType<typeof stateDelivery<X>>;
  pending: Set<Promise<void>>;
  signal: AbortSignal;
  shutdown: () => void;
  report: (text: string) => void;
}>;
export function receivePeer<X extends Program>(session: Session<X>, peer: Peer, message: ClientMessage): void {
  const { house, keys, delivery, signal, shutdown } = session;
  if (!peer.live()) return;
  if (!peer.key()) {
    welcome(house, keys, peer, message, () => delivery.sendState(peer, true));
    return;
  }
  if (signal.aborted) {
    peer.send({ tipo: "rechazo", motivo: said.closing });
    return;
  }
  if (message.tipo === "chau" || message.tipo === "hola") {
    peer.end();
    return;
  }
  if (message.tipo === "sincronizar") {
    peer.reportMismatch();
    delivery.sendState(peer, true);
    return;
  }
  if (message.tipo === "apagar") {
    if (peer.key()?.identity !== house.tools.state().house.admin) peer.send({ tipo: "rechazo", motivo: said.admin });
    else shutdown();
    return;
  }
  routeAndReply(session, peer, message);
}
function routeAndReply<X extends Program>(session: Session<X>, peer: Peer, message: ClientMessage) {
  const { delivery, pending } = session;
  const work = routeRequest(session, peer, message)
    .then(answer =>
      delivery.schedule(() => {
        if (delivery.member(peer)) {
          try {
            peer.send(answer);
          } catch {
            peer.stream.destroy();
          }
        }
      }),
    )
    .catch(() => {
      if (delivery.member(peer)) peer.send({ tipo: "rechazo", motivo: said.failed });
    });
  pending.add(work);
  void work.finally(() => pending.delete(work));
}
function welcome<X extends Program>(
  house: RunningHouse<X>,
  keys: ReadonlyMap<string, DoorKey>,
  peer: Peer,
  message: ClientMessage,
  state: () => void,
) {
  if (message.tipo !== "hola") {
    peer.end();
    return;
  }
  const key = keys.get(message.token);
  /** Identities are always outside the house; a tool's mind never enters through the door. */
  if (
    !key ||
    mindTool(key.identity) !== undefined ||
    !present(house.registry, house.tools.state().house, key.identity)
  ) {
    peer.end({ tipo: "rechazo", motivo: said.denied });
    return;
  }
  const mismatch = helloFailure(message);
  if (mismatch) {
    peer.end({ tipo: "rechazo", motivo: mismatch });
    return;
  }
  peer.enter(key);
  peer.send({
    tipo: "bienvenida",
    protocolo: houseProtocolVersion,
    identidad: key.identity,
    admin: house.tools.state().house.admin === key.identity,
    ahora: house.now(),
    seq: house.tools.state().through,
  });
  state();
}
