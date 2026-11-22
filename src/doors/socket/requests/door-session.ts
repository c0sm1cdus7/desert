// Session controls require hello. Removal ends peers synchronously on the bus before any later reply.
import { isMindActor } from "../../../fields/mind-actor.ts";
import { houseProtocolVersion, type ClientMessage } from "../wire/protocol.ts";
import type { RunningHouse } from "../../../runtime/house-runtime.ts";
import { present } from "../../../house/kit.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { socketTexts as said } from "../../../texts/socket.texts.ts";

import { helloFailure, type DoorKey, type Peer } from "../peers/socket-peer.ts";
import type { requestBook } from "./request-book.ts";
import type { stateDelivery } from "../state/state-delivery.ts";
import { routeRequest } from "./door-requests.ts";
export type Session<X extends Program> = Readonly<{
  house: Pick<RunningHouse<X>, "tools" | "journal" | "bus" | "registry" | "now">;
  keys: Readonly<{ get: (material: string) => DoorKey | undefined }>;
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
    peer.send({ type: "rejection", reason: said.closing });
    return;
  }
  if (message.type === "bye" || message.type === "hello") {
    peer.end();
    return;
  }
  if (message.type !== "act" && !peer.budget.take(message.type === "wait")) {
    peer.send({ type: "rejection", id: "id" in message ? message.id : message.type, reason: said.quota });
    return;
  }
  if (message.type === "sync") {
    peer.reportMismatch();
    delivery.sendState(peer, true);
    return;
  }
  if (message.type === "shutdown") {
    if (peer.key()?.identity !== house.tools.state().house.admin) peer.send({ type: "rejection", reason: said.admin });
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
        try {
          peer.send(answer);
        } catch {
          peer.stream.destroy();
        }
      }),
    )
    .catch(() => {
      peer.send({ type: "rejection", reason: said.failed });
    });
  pending.add(work);
  void work.finally(() => {
    pending.delete(work);
    if (message.type === "wait") peer.budget.finish();
  });
}
function welcome<X extends Program>(
  house: Pick<RunningHouse<X>, "tools" | "journal" | "bus" | "registry" | "now">,
  keys: Readonly<{ get: (material: string) => DoorKey | undefined }>,
  peer: Peer,
  message: ClientMessage,
  state: () => void,
) {
  if (message.type !== "hello") {
    peer.end();
    return;
  }
  const key = keys.get(message.token);
  /** Identities are always outside the house; a tool's mind never enters through the door. */
  if (!key || isMindActor(key.identity) || !present(house.registry, house.tools.state().house, key.identity)) {
    peer.end({ type: "rejection", reason: said.denied });
    return;
  }
  const mismatch = helloFailure(message);
  if (mismatch) {
    peer.end({ type: "rejection", reason: mismatch });
    return;
  }
  peer.enter(key);
  peer.send({
    type: "welcome",
    protocol: houseProtocolVersion,
    identity: key.identity,
    admin: house.tools.state().house.admin === key.identity,
    now: house.now(),
    seq: house.tools.state().through,
  });
  state();
}
