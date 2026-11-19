// Remote peers share the socket request book and state delivery without owning the cloud house lifetime.
import type { Duplex } from "node:stream";
import type { Program } from "../../../tools/tool-contract.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import { liveDoorKeys } from "../peers/live-door-keys.ts";
import { socketPeer, type Peer } from "../peers/socket-peer.ts";
import { receivePeer, type Session } from "../requests/door-session.ts";
import { requestBook } from "../requests/request-book.ts";
import { stateDelivery } from "../state/state-delivery.ts";
export function remoteSessions<X extends Program>(house: Session<X>["house"]) {
  const keys = liveDoorKeys(house);
  const peers = new Set<Peer>();
  const pending = new Set<Promise<void>>();
  const book = requestBook(house);
  const delivery = stateDelivery(house, peers);
  const controller = new AbortController();
  const report = (text: string) => {
    process.stderr.write(`${text}\n`);
  };
  const session: Session<X> = {
    house,
    keys,
    book,
    delivery,
    pending,
    signal: controller.signal,
    shutdown: () => {},
    report,
  };
  return {
    accept(stream: Duplex) {
      if (controller.signal.aborted) {
        stream.destroy();
        return;
      }
      acceptPeer(session, peers, stream);
    },
    async close() {
      controller.abort();
      for (const peer of peers) peer.stream.destroy();
      await Promise.allSettled([...pending]);
      book.stop();
      delivery.stop();
    },
  };
}

function acceptPeer<X extends Program>(session: Session<X>, peers: Set<Peer>, stream: Duplex) {
  const peer = socketPeer(
    stream,
    message => {
      if (message.tipo === "apagar") peer.send({ tipo: "rechazo", id: "apagar", motivo: socketTexts.unavailable });
      else receivePeer(session, peer, message);
    },
    () => peers.delete(peer),
    session.report,
  );
  peers.add(peer);
}
