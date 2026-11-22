import { duplexPair } from "node:stream";
import { afterEach, expect, it, vi } from "vitest";
import { socketConnection } from "../doors/socket/client/socket-connection.ts";
import { clientStream } from "../doors/socket/client/client-stream.ts";
import { frameReader, serverFrame } from "../doors/socket/wire/frame.ts";
import { readClient, readServer, houseProtocolVersion, socketLimits } from "../doors/socket/wire/protocol.ts";
import { stateTransfer } from "../doors/socket/state/state-transfer.ts";
import { socketTexts } from "../texts/socket.texts.ts";

import { socketHouse } from "../../tests/support/socket-house.ts";
import { effect } from "./facts.ts";
import { closeSync, readFileSync, statSync, writeSync } from "node:fs";
import { houseOutput } from "../doors/terminal/house-output.ts";
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const welcome = {
  type: "welcome",
  protocol: houseProtocolVersion,
  identity: "ana",
  admin: true,
  now: 0,
  seq: 1,
} as const;
const state = { through: 1, by: "ana", house: {}, tools: {}, acts: new Map(), entries: [] };
function corrupt() {
  return stateTransfer(state, undefined, 0).map((frame, index) => {
    if (index) return frame;
    const message = readServer(JSON.parse(frame.subarray(5).toString()));
    if (message.type !== "state") throw new Error("Missing fixture header");
    return serverFrame({ ...message, fingerprint: "0".repeat(64) });
  });
}
it.each([false, true])("s12: repeated mismatch closes within the bound (already entered: %s)", async entered => {
  const pair = duplexPair();
  const connection = socketConnection("fixture");
  const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  let requests = 0;
  const bad = corrupt();
  const reader = frameReader("client", value => {
    const message = readClient(value);
    if (message.type === "hello") {
      pair[1].write(serverFrame(welcome));
      for (const frame of entered ? stateTransfer(state, undefined, 0) : bad) pair[1].write(frame);
    } else if (message.type === "sync") {
      requests++;
      if (requests <= 10) for (const frame of bad) pair[1].write(frame);
    }
  });
  pair[1].on("data", (bytes: Buffer) => reader.push(bytes));
  const opening = connection.attach(pair[0]).then(
    () => "ready",
    (error: unknown) => (error instanceof Error ? error.message : "unexpected"),
  );
  try {
    if (entered) {
      expect(await opening).toBe("ready");
      for (const frame of bad) pair[1].write(frame);
    }
    await vi.waitFor(() => expect(connection.status()).toBe("disconnected"), { timeout: 500 });
    expect(requests).toBe(2);
    if (!entered) expect(await opening).toBe(socketTexts.stateUnverified);
    expect(output.mock.calls.filter(([text]) => text === `${socketTexts.stateMismatch}\n`)).toHaveLength(1);
    expect(connection.send({ type: "shutdown" })).toBe(false);
  } finally {
    connection.close();
    pair[1].destroy();
    await opening;
  }
});
it("N10: complete intermediate frames cannot restart the total hello deadline", async () => {
  vi.useFakeTimers();
  const pair = duplexPair();
  pair[1].resume();
  let outcome = "pending";
  const opening = clientStream(
    pair[0],
    "fixture",
    () => false,
    () => {},
  ).catch((error: unknown) => {
    outcome = error instanceof Error ? error.message : "unexpected";
  });
  try {
    for (let n = 0; n < 5; n++) {
      pair[1].write(serverFrame(welcome));
      await vi.advanceTimersByTimeAsync(socketLimits.helloMs / 5);
    }
    expect(outcome).toBe(socketTexts.startTimeout);
  } finally {
    pair.forEach(s => s.destroy());
    await opening;
  }
});
it("N10 original: after entry a complete state header without chunks still has a deadline", async () => {
  vi.useFakeTimers();
  const pair = duplexPair();
  pair[1].resume();
  const opening = clientStream(
    pair[0],
    "fixture",
    value => !Buffer.isBuffer(value) && value.type === "welcome",
    () => {},
  );
  try {
    pair[1].write(serverFrame(welcome));
    await vi.advanceTimersByTimeAsync(0);
    await opening;
    pair[1].write(serverFrame({ type: "state", seq: 1, now: 0, base: null, bytes: 1, fingerprint: "0".repeat(64) }));
    await vi.advanceTimersByTimeAsync(socketLimits.frameMs);
    expect(pair[0].destroyed).toBe(true);
  } finally {
    pair.forEach(s => s.destroy());
    await opening;
  }
});
it("the house writes only one mismatch notice per terminal across repeated syncs and changes", async () => {
  const f = await socketHouse("stream");
  const fd = houseOutput(f.home);
  const output = vi.spyOn(process.stderr, "write").mockImplementation(text => {
    writeSync(fd, String(text));
    return true;
  });
  const sizes: number[] = [];
  try {
    const c = await f.client("ana-terminal");
    for (let n = 0; n < 5; n++) {
      const count = c.states.length;
      c.send({ type: "sync" });
      expect(await c.until(() => c.states.length > count)).toBe(true);
      sizes.push(statSync(`${f.home}/house.log`).size);
      f.house().bus.emit(effect("preferred", { hide: "empty", on: n % 2 === 0 }, "ana"));
    }
    expect(output.mock.calls.filter(([text]) => text === `${socketTexts.stateMismatch}\n`)).toHaveLength(1);
    expect(new Set(sizes).size).toBe(1);
    expect(readFileSync(`${f.home}/house.log`, "utf8")).toBe(`${socketTexts.stateMismatch}\n`);
    const second = await f.client("beto-terminal");
    second.send({ type: "sync" });
    await vi.waitFor(() =>
      expect(output.mock.calls.filter(([text]) => text === `${socketTexts.stateMismatch}\n`)).toHaveLength(2),
    );
  } finally {
    await f.close();
    output.mockRestore();
    closeSync(fd);
  }
});
it("a verified recovery resets the consecutive failure count at the same sequence", async () => {
  const pair = duplexPair();
  const connection = socketConnection("fixture");
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
  let requests = 0;
  const good = stateTransfer(state, undefined, 0);
  const reader = frameReader("client", value => {
    const message = readClient(value);
    if (message.type === "hello") pair[1].write(serverFrame(welcome));
    if (message.type === "sync") requests++;
    for (const frame of good) pair[1].write(frame);
  });
  pair[1].on("data", (bytes: Buffer) => reader.push(bytes));
  try {
    await connection.attach(pair[0]);
    for (let n = 1; n <= 5; n++) {
      for (const frame of corrupt()) pair[1].write(frame);
      await vi.waitFor(() => {
        expect(requests).toBe(n);
        expect(connection.status()).toBe("connected");
      });
    }
  } finally {
    connection.close();
    pair[1].destroy();
  }
});
