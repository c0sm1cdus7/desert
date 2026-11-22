import { expect, it, vi } from "vitest";
import { environmentDoorKeys } from "./environment-door-keys.ts";
const declaration = [
  { identity: "ana", door: "terminal", variable: "ANA_TERMINAL" },
  { identity: "ana", door: "agent", variable: "ANA_AGENT" },
] as const;
it("builds the existing map with the declaration's identity and door, in both encodings", () => {
  const terminal = Buffer.alloc(32, 71).toString("hex"),
    agent = Buffer.alloc(32, 72).toString("base64url");
  const map = environmentDoorKeys({ ANA_TERMINAL: terminal, ANA_AGENT: agent }, declaration);
  expect(map.size).toBe(2);
  expect(map.get(terminal)).toEqual({ identity: "ana", door: "terminal" });
  expect(map.get(agent)).toEqual({ identity: "ana", door: "agent" });
});
it.each([undefined, "", "a".repeat(42), "!".repeat(64), "a".repeat(41) + "B", "a".repeat(43) + "="])(
  "rejects missing, short and malformed encodings, naming the variable (%#)",
  value => {
    expect(() => environmentDoorKeys({ ANA_TERMINAL: value }, declaration)).toThrow("ANA_TERMINAL");
  },
);
it.each(["same", "case", "encoding"])("rejects byte duplicates without showing text or bytes (%s)", mode => {
  const planted = Buffer.alloc(32, 171),
    first = planted.toString("hex");
  const second = mode === "encoding" ? planted.toString("base64url") : first.toUpperCase();
  let error: unknown;
  try {
    environmentDoorKeys({ ANA_TERMINAL: first, ANA_AGENT: mode === "same" ? first : second }, declaration);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(Error);
  const message = error instanceof Error ? `${error.name} ${error.message} ${JSON.stringify(error)}` : "";
  expect(message.includes("ANA_AGENT")).toBe(true);
  for (const value of [first, second, planted.toString("utf8"), planted.toString("base64url")])
    expect(message.includes(value)).toBe(false);
  expect(Buffer.from(message).includes(planted)).toBe(false);
  planted.fill(0);
});
it.each([32, 33, 64])("accepts %i bytes and wipes every decoded copy", length => {
  const terminal = Buffer.alloc(length, 171).toString("hex").toUpperCase(),
    agent = Buffer.alloc(length, 0).toString("base64url");
  const copies = vi.spyOn(Buffer, "from");
  try {
    expect(environmentDoorKeys({ ANA_TERMINAL: terminal, ANA_AGENT: agent }, declaration).size).toBe(2);
    const buffers = copies.mock.results.flatMap(result =>
      result.type === "return" && Buffer.isBuffer(result.value) ? [result.value] : [],
    );
    expect(buffers.length).toBe(2);
    expect(buffers.every(buffer => buffer.every(byte => byte === 0))).toBe(true);
  } finally {
    copies.mockRestore();
  }
});
it.each(["hex", "base64url"] as const)("rejects 31 bytes in %s without exposing them", encoding => {
  const value = Buffer.alloc(31, 71).toString(encoding);
  let error: unknown;
  try {
    environmentDoorKeys({ ANA_TERMINAL: value }, declaration);
  } catch (caught) {
    error = caught;
  }
  expect(error instanceof Error && error.message.includes("ANA_TERMINAL")).toBe(true);
  expect(error instanceof Error && error.message.includes(value)).toBe(false);
});
