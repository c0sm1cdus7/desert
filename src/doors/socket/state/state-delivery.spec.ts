import { duplexPair } from "node:stream";
import { expect, it } from "vitest";
import { socketHouse } from "../../../../tests/support/socket-house.ts";
import { stateDelivery } from "./state-delivery.ts";
import { socketPeer } from "../peers/socket-peer.ts";
import { frameReader } from "../wire/frame.ts";
import { readServer, type ServerMessage } from "../wire/protocol.ts";
import { effect } from "../../../house/facts.ts";
it("N03: a terminal behind the cached delta receives a full state", async () => {
  const f = await socketHouse("stream");
  const pair = duplexPair();
  const peer = socketPeer(
    pair[1],
    () => {},
    () => {},
  );
  const delivery = stateDelivery(f.house(), new Set());
  const headers: ServerMessage[] = [];
  const reader = frameReader("server", value => {
    if (!Buffer.isBuffer(value)) headers.push(readServer(value));
  });
  pair[0].on("data", (bytes: Buffer) => reader.push(bytes));
  peer.enter({ identity: "ana", door: "terminal" });
  try {
    delivery.sendState(peer, true);
    const previous = peer.seq();
    f.house().bus.emit(effect("preferred", { hide: "empty", on: true }, "ana"));
    delivery.sendState(peer);
    peer.sent(previous - 1);
    delivery.sendState(peer);
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(headers.map(header => (header.tipo === "estado" ? header.base : "not state"))).toEqual([
      null,
      previous,
      null,
    ]);
  } finally {
    delivery.stop();
    pair.forEach(s => s.destroy());
    await f.close();
  }
});
