// One view/encoding per identity and sequence; all results queue behind the transfer containing their effects.
import { isMindActor } from "../../../fields/mind-actor.ts";
import { identityView } from "../../../house/members.ts";
import { present } from "../../../house/kit.ts";
import type { RunningHouse } from "../../../runtime/house-runtime.ts";
import type { Program, State } from "../../../tools/tool-contract.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import { stateTransfer } from "./state-transfer.ts";
import type { Peer } from "../peers/socket-peer.ts";
export function stateDelivery<X extends Program>(house: RunningHouse<X>, peers: Set<Peer>) {
  let stopped = false;
  let scheduled: NodeJS.Immediate | undefined;
  let answers: (() => void)[] = [];
  const member = (peer: Peer) => isMember(house, peer);
  const { frames, clear } = transferCache(house);
  const sendState = (peer: Peer, full = false) => sendView(house, peer, frames, full);
  const flush = () => {
    scheduled = undefined;
    peers.forEach(peer => sendState(peer));
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
      clear();
    },
  };
}
function isMember<X extends Program>(house: RunningHouse<X>, peer: Peer): boolean {
  const key = peer.key();
  if (!key || !peer.live()) return false;
  const current = house.tools.state().house;
  if (
    !isMindActor(key.identity) &&
    present(house.registry, current, key.identity) &&
    key.id !== undefined &&
    current.doors.keys.get(key.id)?.revoked === false
  )
    return true;
  peer.end({ tipo: "cortado", motivo: socketTexts.removed });
  return false;
}

function transferCache<X extends Program>(house: RunningHouse<X>) {
  const cache = new Map<
    string,
    { view: State<X>; before?: State<X>; full?: readonly Buffer[]; delta?: readonly Buffer[] }
  >();
  const frames = (identity: string, seq: number) => {
    const state = house.tools.state();
    let saved = cache.get(identity);
    if (!saved || saved.view.through !== state.through) {
      saved = { view: identityView(state, identity), ...(saved ? { before: saved.view } : {}) };
      cache.set(identity, saved);
    }
    if (saved.before?.through === seq) return (saved.delta ??= stateTransfer(saved.view, saved.before, house.now()));
    return (saved.full ??= stateTransfer(saved.view, undefined, house.now()));
  };
  return { frames, clear: () => cache.clear() };
}

function sendView<X extends Program>(
  house: RunningHouse<X>,
  peer: Peer,
  frames: (identity: string, seq: number) => readonly Buffer[],
  full: boolean,
) {
  if (!isMember(house, peer) || peer.key()?.door !== "terminal") return;
  const seq = house.tools.state().through;
  if (!full && peer.seq() === seq) return;
  try {
    peer.sendFrames(frames(peer.key()?.identity ?? "", full ? -1 : peer.seq()));
    peer.sent(seq);
  } catch {
    peer.fail(socketTexts.stateFailed);
  }
}
