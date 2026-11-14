// A turn's changes become one final identityView; queued results follow the state containing their effects.
import { identityView } from "../../house/house.ts";
import type { RunningHouse } from "../../programs/house-runtime.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import { stateFrame } from "./frame.ts";
import type { Peer } from "./socket-peer.ts";
export function stateDelivery<X extends Program>(house: RunningHouse<X>, peers: Set<Peer>) {
  let stopped = false;
  let scheduled: NodeJS.Immediate | undefined;
  let answers: (() => void)[] = [];
  const member = (peer: Peer) => isMember(house, peer);
  const sendState = (peer: Peer, welcome = false) => deliverState(house, peer, welcome);
  const flush = () => {
    scheduled = undefined;
    for (const peer of peers) {
      try {
        sendState(peer);
      } catch {
        peer.stream.destroy();
      }
    }
    const waiting = answers;
    answers = [];
    waiting.forEach(answer => answer());
  };
  const schedule = (answer?: () => void) => {
    if (stopped) return;
    if (answer) answers.push(answer);
    scheduled ??= setImmediate(flush);
  };
  const stop = house.bus.on(() => {
    peers.forEach(member);
    schedule();
  });
  return {
    member,
    sendState,
    schedule,
    stop: () => {
      stopped = true;
      stop();
      if (scheduled) clearImmediate(scheduled);
      answers = [];
    },
  };
}

function isMember<X extends Program>(house: RunningHouse<X>, peer: Peer): boolean {
  const key = peer.key();
  if (!key || !peer.live()) return false;
  if (house.tools.state().house.grants.has(key.identity)) return true;
  peer.end({ tipo: "cortado", motivo: socketTexts.removed });
  return false;
}
function deliverState<X extends Program>(house: RunningHouse<X>, peer: Peer, welcome: boolean) {
  if (!isMember(house, peer) || peer.key()?.door !== "terminal") return;
  const state = house.tools.state();
  if (peer.seq() === state.through) return;
  const bytes = stateFrame(identityView(state, peer.key()?.identity ?? ""));
  if (!welcome) peer.send({ tipo: "estado", seq: state.through, ahora: house.now() });
  peer.sendBytes(bytes);
  peer.sent(state.through);
}
