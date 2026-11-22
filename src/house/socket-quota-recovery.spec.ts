import { duplexPair } from "node:stream";
import { expect, it, vi } from "vitest";
import { socketConnection } from "../doors/socket/client/socket-connection.ts";
import { clientRequests } from "../doors/socket/client/client-requests.ts";
import { frameReader, serverFrame } from "../doors/socket/wire/frame.ts";
import { readClient, houseProtocolVersion, socketLimits } from "../doors/socket/wire/protocol.ts";
import { stateTransfer } from "../doors/socket/state/state-transfer.ts";

import { socketTexts } from "../texts/socket.texts.ts";
it("a quota refusal retries a lost payment lookup without sending the act again", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const connection = socketConnection("fixture");
  const actIds: string[] = [],
    lookups: string[] = [],
    results: string[] = [];
  const pairs: ReturnType<typeof duplexPair>[] = [];
  const open = () => {
    const pair = duplexPair();
    pairs.push(pair);
    const reader = frameReader("client", value => {
      const message = readClient(value);
      if (message.type === "hello") {
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
        const view = { through: 1, by: "ana", house: {}, tools: {}, acts: new Map(), entries: [] };
        stateTransfer(view, undefined, 0).forEach(frame => pair[1].write(frame));
      } else if (message.type === "act") actIds.push(message.id);
      else if (message.type === "read") {
        lookups.push(message.id);
        pair[1].write(
          serverFrame(
            lookups.length === 1
              ? { type: "rejection", id: message.id, reason: socketTexts.quota }
              : { type: "result", id: message.id, status: "accepted", effects: [] },
          ),
        );
      }
    });
    pair[1].on("data", (bytes: Buffer) => reader.push(bytes));
    return connection.attach(pair[0]);
  };
  connection.receive(message => {
    if (message.type === "result") results.push(message.id);
  });
  try {
    await open();
    const result = clientRequests(connection)({ act: "prefer", input: { hide: "empty", on: true } }, 0);
    await new Promise<void>(resolve => setImmediate(resolve));
    pairs[0]?.[1].destroy();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(result.status).toBe("processing");
    if (result.status === "processing") expect((await result.completion).status).toBe("interrupted");
    await open();
    await vi.advanceTimersByTimeAsync(0);
    expect(lookups).toEqual(actIds);
    await vi.advanceTimersByTimeAsync(socketLimits.requestMs);
    expect(lookups).toEqual([...actIds, ...actIds]);
    expect(results).toEqual(actIds);
    expect(actIds).toHaveLength(1);
  } finally {
    connection.close();
    pairs.forEach(pair => pair.forEach(s => s.destroy()));
    output.mockRestore();
    vi.useRealTimers();
  }
});
