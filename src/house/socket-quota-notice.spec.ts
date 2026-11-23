import { performance } from "node:perf_hooks";
import { everySaid } from "../fields/phrases.ts";
import { duplexPair } from "node:stream";
import { expect, it, vi } from "vitest";
import { socketConnection } from "../doors/socket/client/socket-connection.ts";
import { serverFrame } from "../doors/socket/wire/frame.ts";
import { stateTransfer } from "../doors/socket/state/state-transfer.ts";
import { socketTexts } from "../texts/socket.texts.ts";
import { houseProtocolVersion } from "../doors/socket/wire/protocol.ts";
it("N8: the terminal visibly reports a quota refusal once per second and keeps reading", async () => {
  const pair = duplexPair();
  const connection = socketConnection("fixture");
  const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  let now = 0;
  const clock = vi.spyOn(performance, "now").mockImplementation(() => now);
  pair[1].resume();
  const entering = connection.attach(pair[0]);
  pair[1].write(
    serverFrame({
      type: "welcome",
      protocol: houseProtocolVersion,
      identity: "ana",
      admin: true,
      now: 0,
      seq: 1,
    }),
  );
  const state = { through: 1, by: "ana", house: {}, tools: {}, acts: new Map(), entries: [] };
  for (const frame of stateTransfer(state, undefined, 0)) pair[1].write(frame);
  try {
    await entering;
    for (let i = 0; i < 100; i++)
      pair[1].write(serverFrame({ type: "rejection", id: "default", reason: socketTexts.quota }));
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(output).toHaveBeenCalledExactlyOnceWith(`${everySaid(socketTexts.quota)}\n`);
    expect(connection.status()).toBe("connected");
    now = 1000;
    pair[1].write(serverFrame({ type: "rejection", id: "wait", reason: socketTexts.quota }));
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(output).toHaveBeenCalledTimes(2);
    expect(connection.state()).toEqual(state);
  } finally {
    connection.close();
    pair[1].destroy();
    clock.mockRestore();
    output.mockRestore();
    await entering;
  }
});
