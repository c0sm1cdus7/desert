import { expect, it } from "vitest";
import { socketHouse } from "../../../../tests/support/socket-house.ts";
import { requestBook } from "./request-book.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import { houseProtocolVersion } from "../wire/protocol.ts";
import { stateHash } from "../state/state-hash.ts";
import { jsonData } from "./json-data.ts";
it.each([
  -0,
  Infinity,
  -Infinity,
  NaN,
  undefined,
  1n,
  new Date("2026-11-16T20:22:37.000Z"),
  new Map(),
  new Set(),
  [, 1],
  { x: undefined },
])("rejects non-JSON or lossy input without writing: %s", async input => {
  const f = await socketHouse("stream");
  const book = requestBook(f.house());
  try {
    const before = f.house().tools.state().through;
    const answer = await book.act("ana", { type: "act", id: "invalid", act: "attend", input, through: 0 });
    expect(answer).toEqual({ type: "rejection", id: "invalid", reason: socketTexts.invalidData });
    expect(f.house().tools.state().through).toBe(before);
  } finally {
    book.stop();
    await f.close();
  }
});
it("raw -0 and overflow write nothing; a valid request still works", async () => {
  const f = await socketHouse("stream");
  try {
    const c = await f.client("ana-terminal");
    for (const number of ["-0", "1e999", "-1e999", "-1e-999"]) {
      const before = f.house().tools.state().through;
      const body = Buffer.from(
        `{"type":"act","id":"${number}","act":"register","target":"sales",` +
          `"input":{"sale":"gift","total":${number}},"through":0}`,
      );
      const header = Buffer.alloc(5);
      header.writeUInt32BE(body.length + 1);
      c.socket.write(Buffer.concat([header, body]));
      expect(await c.until(() => c.messages.some(m => m.type === "rejection" && m.id === number))).toBe(true);
      expect(f.house().tools.state().through).toBe(before);
    }
    c.send({ type: "act", id: "ok", act: "attend", input: { target: "sales" }, through: 0 });
    expect((await c.result("ok"))?.status).toBe("accepted");
    c.send({ type: "act", id: "-0", act: "register", target: "sales", input: { sale: "gift", total: 0 }, through: 0 });
    expect((await c.result("-0"))?.status).toBe("accepted");
    const before = stateHash(f.house().tools.state().tools);
    await f.reopen();
    expect(stateHash(f.house().tools.state().tools)).toBe(before);
  } finally {
    await f.close();
  }
});
it("JSON validation rejects hidden losses without invoking getters or toJSON, and accepts deep JSON", () => {
  const cyclic: unknown[] = [];
  cyclic.push(cyclic);
  const getter = {
    get x() {
      throw new Error("Must not run");
    },
  };
  const custom = {
    toJSON() {
      throw new Error("Must not run");
    },
  };
  for (const value of [
    cyclic,
    getter,
    custom,
    Object.setPrototypeOf([1], { toJSON: () => 7 }),
    Symbol("x"),
    () => {},
    { [Symbol("x")]: 1 },
    Object.defineProperty({}, "x", { value: 1 }),
    Object.defineProperty([1], "0", {
      get() {
        throw new Error("Must not run");
      },
    }),
  ])
    expect(jsonData(value)).toBe(false);
  let deep: unknown = { __proto__: null, number: 10.5, text: "\ud800 €", empty: null, bool: true };
  for (let n = 0; n < 4000; n++) deep = { nested: deep };
  expect(jsonData(deep)).toBe(true);
});
it.each([2, 3])("protocol %i, older than the house's English wire, cannot enter", async protocol => {
  const f = await socketHouse("stream");
  try {
    const c = await f.client();
    c.hello("ana-terminal", { protocol });
    expect(await c.until(c.closed)).toBe(true);
    expect(c.messages).toEqual([{ type: "rejection", reason: socketTexts.version(houseProtocolVersion, protocol) }]);
    expect(c.states).toEqual([]);
  } finally {
    await f.close();
  }
});
it.each(['{"type":"read","id":"invalid","what":"catalog","since":-0}', '{"type":"wait","id":"invalid","until":-0}'])(
  "JSON validation also guards the other request paths: %s",
  async json => {
    const f = await socketHouse("stream");
    try {
      const c = await f.client("ana-terminal");
      const before = f.house().tools.state().through;
      const body = Buffer.from(json);
      const header = Buffer.alloc(5);
      header.writeUInt32BE(body.length + 1);
      c.socket.write(Buffer.concat([header, body]));
      expect(await c.until(() => c.messages.some(m => "id" in m && m.id === "invalid"))).toBe(true);
      expect(c.messages.at(-1)).toEqual({ type: "rejection", id: "invalid", reason: socketTexts.invalidData });
      expect(f.house().tools.state().through).toBe(before);
    } finally {
      await f.close();
    }
  },
);
