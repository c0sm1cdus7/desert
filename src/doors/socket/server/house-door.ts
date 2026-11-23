// One live house owns all sessions; the same byte protocol can be checked on in-memory duplex streams.
import { meant } from "../../../fields/phrases.ts";
import { publicMessage } from "../requests/public-message.ts";
import { liveDoorKeys } from "../peers/live-door-keys.ts";
import { socketLimits } from "../wire/protocol.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import type { Duplex } from "node:stream";
import type { RunningHouse } from "../../../runtime/house-runtime.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { socketPeer, type DoorKey, type Peer } from "../peers/socket-peer.ts";
import { requestBook } from "../requests/request-book.ts";
import { stateDelivery } from "../state/state-delivery.ts";
import { receivePeer, type Session } from "../requests/door-session.ts";
import { houseShutdown } from "./house-drain.ts";
type DoorOptions = Readonly<{ shutdown?: () => void; report?: (text: string) => void }>;
export function houseDoor<X extends Program>(
  house: RunningHouse<X>,
  founders?: ReadonlyMap<string, DoorKey>,
  options: DoorOptions = {},
) {
  const keys = liveDoorKeys(house, founders);
  const peers = new Set<Peer>();
  const pending = new Set<Promise<void>>();
  const book = requestBook(house);
  const delivery = stateDelivery(house, peers);
  const { signal, close, cancel } = houseShutdown(house, peers, pending, [book.stop, delivery.stop], options.report);
  const session = {
    house,
    report:
      options.report ??
      ((text: string) => {
        process.stderr.write(`${text}\n`);
      }),
    keys,
    book,
    delivery,
    pending,
    signal,
    shutdown:
      options.shutdown ??
      (() => {
        void close();
      }),
  };
  const accept = acceptPeer(session, peers);
  return { accept, close, cancel };
}

function acceptPeer<X extends Program>(session: Session<X>, peers: Set<Peer>) {
  return (stream: Duplex) => {
    if (session.signal.aborted) {
      stream.destroy();
      return;
    }
    const waiting = [...peers].filter(peer => !peer.key() && peer.live());
    if (waiting.length >= socketLimits.unintroduced) {
      session.report(meant(socketTexts.busy));
      waiting[0]?.stream.destroy();
      if (waiting[0]) peers.delete(waiting[0]);
    }
    const peer = socketPeer(
      stream,
      message => receivePeer(session, peer, message),
      () => peers.delete(peer),
      session.report,
      message => publicMessage(message, session.house.tools.prepare),
    );
    peers.add(peer);
  };
}
