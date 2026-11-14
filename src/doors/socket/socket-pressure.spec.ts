import { effect } from "../../journal/events.ts";
import { socketConnection } from "./socket-connection.ts";
import { duplexPair } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, expect, it, vi } from "vitest";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { socketPeer } from "./socket-peer.ts";
import { socketLimits } from "../../catalogs/levers.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import { clientFrame, frameReader } from "./frame.ts";
afterEach(() => vi.restoreAllMocks());
it("M05: a reader that stalls is cut with a report while a healthy terminal continues", async () => {
  const f = await socketHouse("stream");
  const pair = duplexPair();
  const report = vi.fn();
  const peer = socketPeer(
    pair[1],
    () => {},
    () => {},
    report,
  );
  peer.enter({ identity: "ana", door: "terminal" });
  try {
    peer.sendBytes(Buffer.alloc(socketLimits.chunk));
    peer.sendBytes(Buffer.alloc(socketLimits.pendingBytes + 1));
    expect(report).toHaveBeenCalledWith(socketTexts.slow);
    const c = await f.client("ana-terminal");
    expect(c.states).toHaveLength(1);
    expect(peer.live()).toBe(false);
  } finally {
    pair.forEach(s => s.destroy());
    await f.close();
  }
});
it("a stalled snapshot is cut on its drain deadline even without subsequent changes", async () => {
  const pair = duplexPair();
  const report = vi.fn();
  const peer = socketPeer(
    pair[1],
    () => {},
    () => {},
    report,
  );
  peer.enter({ identity: "ana", door: "terminal" });
  try {
    peer.sendFrames([Buffer.alloc(socketLimits.chunk), Buffer.alloc(socketLimits.chunk)]);
    await delay(socketLimits.blockedMs + 80);
    expect(report).toHaveBeenCalledWith(socketTexts.slow);
    expect(peer.live()).toBe(false);
  } finally {
    pair.forEach(s => s.destroy());
  }
});
it("g01 c2: a promised body expires after hello, including a later partial frame in the same chunk", async () => {
  const f = await socketHouse("stream");
  try {
    const c = await f.client("ana-terminal");
    const header = Buffer.alloc(6);
    header.writeUInt32BE(1024 * 1024);
    const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    c.socket.write(Buffer.concat([clientFrame({ tipo: "leer", id: "cat", qué: "catalogo" }), header]));
    expect(await c.until(c.closed, socketLimits.frameMs + 500)).toBe(true);
    expect(output).toHaveBeenCalledWith(`${socketTexts.bodyTimeout}\n`);
  } finally {
    await f.close();
  }
}, 7000);
it("g01 l: reading one byte at a time never concatenates the accumulated frame", () => {
  const bytes = clientFrame({ tipo: "acto", id: "large", act: "prefer", input: "a".repeat(32_000), through: 0 });
  const concat = vi.spyOn(Buffer, "concat").mockImplementation(() => {
    throw new Error("A frame prefix was copied");
  });
  const receive = vi.fn();
  const reader = frameReader("client", receive);
  for (let i = 0; i < bytes.length; i++) reader.push(bytes.subarray(i, i + 1));
  expect(receive).toHaveBeenCalledTimes(1);
  expect(concat).not.toHaveBeenCalled();
});
it("g09: 300 unfinished introductions stay under 256 MiB RSS growth and release their slots", async () => {
  const f = await socketHouse("stream");
  const report = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const start = process.memoryUsage().rss;
  const pairs = [];
  try {
    const good = await f.client("ana-terminal");
    const partial = Buffer.alloc(socketLimits.json - 10);
    partial.writeUInt32BE(socketLimits.json + 1);
    for (let i = 0; i < 300; i++) {
      const pair = duplexPair();
      pairs.push(pair);
      f.attach(pair[1]);
      if (!pair[1].destroyed) pair[0].write(partial);
    }
    await delay(30);
    expect(pairs.filter(pair => !pair[1].destroyed)).toHaveLength(socketLimits.unintroduced);
    expect(process.memoryUsage().rss - start).toBeLessThan(256 * 1024 * 1024);
    expect(report).toHaveBeenCalledWith(`${socketTexts.busy}\n`);
    good.send({ tipo: "leer", id: "cat", qué: "catalogo" });
    expect(await good.until(() => good.messages.some(m => m.tipo === "respuesta"))).toBe(true);
    pairs.forEach(pair => pair.forEach(s => s.destroy()));
    await delay(10);
    expect((await f.client("ana-terminal")).states).toHaveLength(1);
  } finally {
    pairs.forEach(pair => pair.forEach(s => s.destroy()));
    await f.close();
  }
});

it("a paused terminal in the same house cannot hold back another terminal's large update", async () => {
  const f = await socketHouse("stream");
  const pair = duplexPair();
  f.attach(pair[1]);
  const slow = socketConnection("ana-terminal");
  try {
    await slow.attach(pair[0]);
    pair[0].pause();
    const good = await f.client("ana-terminal");
    const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    f.house().bus.emit(
      effect(
        "tool-entry",
        {
          tool: "payments",
          target: "payments",
          author: "ana",
          text: "x".repeat(2_000_000),
        },
        "ana",
      ),
    );
    expect(await good.until(() => good.states.length === 2)).toBe(true);
    expect(good.closed()).toBe(false);
    await vi.waitFor(() => expect(pair[1].writableEnded).toBe(true), { timeout: 2000 });
    expect(output).toHaveBeenCalledWith(`${socketTexts.slow}\n`);
    expect(good.closed()).toBe(false);
  } finally {
    slow.close();
    pair[1].destroy();
    await f.close();
  }
});
