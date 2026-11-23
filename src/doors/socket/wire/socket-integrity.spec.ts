import { duplexPair } from "node:stream";
import { type Text, everySaid, meant } from "../../../fields/phrases.ts";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, expect, it, vi } from "vitest";
import { socketHouse } from "../../../../tests/support/socket-house.ts";
import { socketConnection } from "../client/socket-connection.ts";
import { serverFrame, frameReader, clientFrame } from "./frame.ts";
import { readServer, readClient, houseProtocolVersion } from "./protocol.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import { effect } from "../../../house/facts.ts";
import { connectionState } from "../client/connection-state.ts";
import { stateTransfer } from "../state/state-transfer.ts";
import { identityView } from "../../../house/members.ts";

import * as transfer from "../state/state-transfer.ts";
/** A line the house writes in English, or the terminal before it knows who reads, in every language. */
const saidOf = (text: Text): readonly string[] => [`${meant(text)}\n`, `${everySaid(text)}\n`];
afterEach(() => vi.restoreAllMocks());
it("a wrong fingerprint never publishes a view, visibly requests a full view and reports at the house", async () => {
  const f = await socketHouse("stream");
  const connection = socketConnection("ana-terminal");
  const server = duplexPair(),
    terminal = duplexPair();
  f.attach(server[1]);
  let corrupt = false;
  const requests: string[] = [];
  const reader = frameReader("client", value => {
    requests.push(readClient(value).type);
  });
  terminal[1].on("data", (bytes: Buffer) => {
    reader.push(bytes);
    server[0].write(bytes);
  });
  server[0].on("data", (bytes: Buffer) => {
    if (corrupt && bytes[4] === 0) {
      const message = readServer(JSON.parse(bytes.subarray(5).toString()));
      if (message.type === "state") {
        corrupt = false;
        terminal[1].write(serverFrame({ ...message, fingerprint: "0".repeat(64) }));
        return;
      }
    }
    terminal[1].write(bytes);
  });
  const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  try {
    await connection.attach(terminal[0]);
    const before = connection.state();
    const shown: unknown[] = [];
    connection.watch(() => {
      shown.push(connection.state());
    });
    corrupt = true;
    f.house().bus.emit(effect("preferred", { hide: "empty", on: true }, "ana"));
    await vi.waitFor(() => expect(connection.state().through).toBe(f.house().tools.state().through));
    expect(requests.filter(type => type === "sync")).toEqual(["sync"]);
    expect(output.mock.calls.filter(([text]) => saidOf(socketTexts.stateMismatch).includes(String(text)))).toHaveLength(
      2,
    );
    expect(shown).toEqual([before, identityView(f.house().tools.state(), "ana")]);
  } finally {
    connection.close();
    server.forEach(s => s.destroy());
    terminal.forEach(s => s.destroy());
    await f.close();
  }
});
it("M18: a valid hash for another identity is still refused", async () => {
  const f = await socketHouse("stream");
  try {
    const state = connectionState();
    state.metadata({
      type: "welcome",
      protocol: houseProtocolVersion,
      identity: "ana",
      admin: true,
      seq: f.house().tools.state().through,
      now: 0,
    });
    const reader = frameReader("server", value => {
      if (Buffer.isBuffer(value)) state.accept(value);
      else state.metadata(readServer(value));
    });
    const frames = stateTransfer(identityView(f.house().tools.state(), "beto"), undefined, 0);
    expect(() => frames.forEach(frame => reader.push(frame))).toThrow("Invalid house state");
    expect(() => state.state()).toThrow();
  } finally {
    await f.close();
  }
});
it("M17: a connected transport still sends no acts while waiting for its verified state", async () => {
  const connection = socketConnection("ana-terminal");
  const pair = duplexPair();
  const sent: string[] = [];
  const reader = frameReader("client", value => {
    sent.push(readClient(value).type);
  });
  pair[1].on("data", (bytes: Buffer) => reader.push(bytes));
  const entering = connection.attach(pair[0]).catch(() => undefined);
  try {
    await delay(10);
    expect(connection.send({ type: "shutdown" })).toBe(false);
    expect(sent).toEqual(["hello"]);
  } finally {
    connection.close();
    pair[1].destroy();
    await entering;
  }
});
it("five terminals share one full encoding and one changed encoding per identity", async () => {
  const f = await socketHouse("stream");
  const encode = vi.spyOn(transfer, "stateTransfer");
  try {
    const clients = [];
    for (let i = 0; i < 5; i++) clients.push(await f.client("ana-terminal"));
    expect(encode).toHaveBeenCalledTimes(1);
    f.house().bus.emit(effect("preferred", { hide: "empty", on: true }, "ana"));
    for (const c of clients) expect(await c.until(() => c.states.length === 2)).toBe(true);
    expect(encode).toHaveBeenCalledTimes(2);
    encode.mockImplementation(() => {
      throw new Error("fixture encoding failure");
    });
    const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    f.house().bus.emit(effect("preferred", { hide: "empty", on: false }, "ana"));
    for (const c of clients) {
      expect(await c.until(c.closed)).toBe(true);
      expect(c.messages.at(-1)).toEqual({ type: "cut", reason: socketTexts.stateFailed });
    }
    expect(output).toHaveBeenCalledWith(`${meant(socketTexts.stateFailed)}\n`);
  } finally {
    await f.close();
  }
});
it("M15: removing an identity ends its streams synchronously before another queued request", async () => {
  const f = await socketHouse("stream");
  const pair = duplexPair();
  f.attach(pair[1]);
  try {
    pair[0].resume();
    pair[0].write(
      clientFrame({
        type: "hello",
        protocol: houseProtocolVersion,
        node: process.versions.node,
        token: "beto-terminal",
      }),
    );
    await delay(10);
    f.house().bus.emit(effect("removed", { identity: "beto" }, "ana"));
    expect(pair[1].writableEnded).toBe(true);
  } finally {
    pair.forEach(s => s.destroy());
    await f.close();
  }
});

it("a matching fingerprint with a different sequence is never published", async () => {
  const f = await socketHouse("stream");
  try {
    const view = connectionState();
    view.metadata({
      type: "welcome",
      protocol: houseProtocolVersion,
      identity: "ana",
      admin: true,
      seq: 0,
      now: 0,
    });
    const reader = frameReader("server", value => {
      if (Buffer.isBuffer(value)) {
        view.accept(value);
        return;
      }
      const message = readServer(value);
      view.metadata(message.type === "state" ? { ...message, seq: message.seq + 1 } : message);
    });
    const frames = stateTransfer(identityView(f.house().tools.state(), "ana"), undefined, 0);
    expect(() => frames.forEach(frame => reader.push(frame))).toThrow("Invalid house state");
    expect(() => view.state()).toThrow();
  } finally {
    await f.close();
  }
});
it("a failed state send is visible in the connected terminal as well as the house output", async () => {
  const f = await socketHouse("stream");
  const connection = socketConnection("ana-terminal");
  const pair = duplexPair();
  f.attach(pair[1]);
  try {
    await connection.attach(pair[0]);
    const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.spyOn(transfer, "stateTransfer").mockImplementation(() => {
      throw new Error("private fixture error");
    });
    f.house().bus.emit(effect("preferred", { hide: "empty", on: true }, "ana"));
    await vi.waitFor(() => expect(connection.status()).toBe("disconnected"));
    expect(output.mock.calls.filter(([text]) => saidOf(socketTexts.stateFailed).includes(String(text)))).toHaveLength(
      2,
    );
  } finally {
    connection.close();
    pair[1].destroy();
    await f.close();
  }
});
