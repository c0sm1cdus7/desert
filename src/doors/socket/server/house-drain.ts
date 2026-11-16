// Bounded shutdown lets running acts finish; their count remains visible if the deadline wins.
import { socketLimits } from "../wire/protocol.ts";
import type { RunningHouse } from "../../../runtime/house-runtime.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { socketTexts as said } from "../../../texts/socket.texts.ts";
import type { Peer } from "../peers/socket-peer.ts";
export async function drainHouse<X extends Program>(
  house: RunningHouse<X>,
  peers: Set<Peer>,
  pending: Set<Promise<void>>,
  stop: () => void,
  report: (text: string) => void = text => process.stderr.write(`${text}\n`),
) {
  for (const peer of peers)
    if (peer.key()) peer.send({ tipo: "cerrando" });
    else peer.end();
  const waiting = idleHouse(house, pending);
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    waiting.completion,
    new Promise<void>(resolve => {
      timer = setTimeout(resolve, socketLimits.drainMs);
    }),
  ]);
  if (timer) clearTimeout(timer);
  waiting.stop();
  await new Promise<void>(resolve => setImmediate(resolve));
  const remaining = house.tools.state().processing.size;
  stop();
  try {
    house.close();
  } finally {
    peers.forEach(peer => peer.end());
    report(said.pending(remaining));
  }
  return { remaining };
}

export function houseShutdown<X extends Program>(
  house: RunningHouse<X>,
  peers: Set<Peer>,
  pending: Set<Promise<void>>,
  stops: readonly (() => void)[],
  report?: (text: string) => void,
) {
  const abort = new AbortController();
  let closed: Promise<{ remaining: number }> | undefined;
  const close = () => {
    abort.abort();
    closed ??= drainHouse(house, peers, pending, () => stops.forEach(stop => stop()), report);
    return closed;
  };
  const cancel = () => {
    abort.abort();
    stops.forEach(stop => stop());
    peers.forEach(peer => peer.end());
    house.close();
  };
  return { signal: abort.signal, close, cancel };
}

function idleHouse<X extends Program>(house: RunningHouse<X>, pending: Set<Promise<void>>) {
  if (pending.size === 0 && house.tools.state().processing.size === 0)
    return { completion: Promise.resolve(), stop: () => {} };
  let stop = () => {};
  const completion = new Promise<void>(resolve => {
    let settled = false;
    const check = () => {
      if (settled && house.tools.state().processing.size === 0) resolve();
    };
    stop = house.bus.on(check);
    void Promise.allSettled([...pending]).then(() => {
      settled = true;
      check();
    });
  });
  return { completion, stop: () => stop() };
}
