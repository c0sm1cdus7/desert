import { expect, it } from "vitest";
import { deserialize } from "node:v8";
import { clientFrame, serverFrame, stateFrame, frameReader } from "./frame.ts";
import { readClient, readServer } from "./protocol.ts";
import { wire } from "../../../tests/support/socket-probe.ts";
it("frames survive every split, coalescing and exact JSON limit", () => {
  const hello = { tipo: "hola", protocolo: 1, node: process.versions.node, token: "test" } as const;
  const bytes = clientFrame(hello);
  expect(bytes.length).toBeGreaterThan(5);
  for (let split = 0; split <= bytes.length; split++) {
    const got: unknown[] = [];
    const reader = frameReader("client", value => got.push(value));
    reader.push(bytes.subarray(0, split));
    reader.push(bytes.subarray(split));
    reader.end();
    expect(got).toEqual([hello]);
  }
  const got: unknown[] = [];
  const reader = frameReader("client", value => got.push(value));
  reader.push(Buffer.concat([bytes, bytes]));
  expect(got).toHaveLength(2);
});
it("server encoding validates and preserves maps and sets in binary state", () => {
  expect(serverFrame({ tipo: "cerrando" }).length).toBeGreaterThan(5);
  const state = { map: new Map([["a", new Set([1, 2])]]) };
  const encoded = stateFrame(state);
  expect(encoded[4]).toBe(1);
  expect(deserialize(encoded.subarray(5))).toEqual(state);
});
it.each([
  wire({}, 1),
  wire({}, 7),
  Buffer.alloc(5),
  Buffer.from([0, 0, 0, 2, 0, 123]),
  wire({ tipo: "chau", identidad: "ana" }),
])("rejects broken and forbidden frames before delivering anything", bytes => {
  const got: unknown[] = [];
  const reader = frameReader("client", value => got.push(value));
  expect(() => reader.push(bytes)).toThrow();
  expect(got).toEqual([]);
});
it("rejects overflow at the header and truncated EOF", () => {
  const huge = Buffer.alloc(5);
  huge.writeUInt32BE(1024 * 1024 + 2);
  expect(() => frameReader("client", () => {}).push(huge)).toThrow();
  const reader = frameReader("client", () => {});
  reader.push(Buffer.from([0, 0]));
  expect(() => reader.end()).toThrow();
});
it("TypeBox rejects undeclared fields on both sides", () => {
  expect(() => readClient({ tipo: "hola", protocolo: 1, node: "24", token: "t", puerta: "terminal" })).toThrow();
  expect(() => readServer({ tipo: "resultado", id: "a", status: "invented", efectos: [] })).toThrow();
});
it("accepts exactly 1 MiB JSON and rejects the next byte, including a header without its type", () => {
  const base = { tipo: "acto", id: "a", act: "prefer", input: "", through: 0 } as const;
  const room = 1024 * 1024 - Buffer.byteLength(JSON.stringify(base));
  const message = { ...base, input: "a".repeat(room) };
  const bytes = clientFrame(message);
  expect(bytes.length).toBe(1024 * 1024 + 5);
  const got: unknown[] = [];
  frameReader("client", value => got.push(value)).push(bytes);
  expect(got).toEqual([message]);
  expect(() => clientFrame({ ...message, input: `${message.input}b` })).toThrow();
  const header = Buffer.alloc(4);
  header.writeUInt32BE(1024 * 1024 + 2);
  expect(() => frameReader("client", () => {}).push(header)).toThrow();
});
it("rejects bad UTF-8, partial payloads and states beyond 16 MiB", () => {
  const bytes = wire({ tipo: "hola", protocolo: 1, node: "a", token: "t" });
  bytes[bytes.indexOf(Buffer.from('"a"')) + 1] = 255;
  expect(() => frameReader("client", () => {}).push(bytes)).toThrow();
  const reader = frameReader("client", () => {});
  reader.push(wire({ tipo: "chau" }).subarray(0, 6));
  expect(() => reader.end()).toThrow();
  expect(() => stateFrame(Buffer.alloc(16 * 1024 * 1024))).toThrow();
});
