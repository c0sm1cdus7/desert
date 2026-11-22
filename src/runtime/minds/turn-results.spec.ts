// Proves what a journey hears of each act's return: the receipt whole, or cut by whole characters with the count.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { resultsText } from "./turn-results.ts";
const act = { act: "run", target: "agents", input: {} };
const tell = (value: unknown, status: "accepted" | "rejected" = "accepted") =>
  resultsText("es", [{ act, status, ...(status === "rejected" ? { reason: "exit 1" } : {}), value }], 5, {
    before: [],
    after: [],
  }).split("\n");
it("tells a short receipt whole, after the act's line, accepted or rejected", () => {
  expect(tell({ exit: 0, out: "listo" }).slice(1, 3)).toEqual([
    "1. run → agents: aceptado.",
    '   Devolvió: {"exit":0,"out":"listo"}',
  ]);
  expect(tell({ exit: 1, out: "falló" }, "rejected").slice(1, 3)).toEqual([
    "1. run → agents: rechazado: exit 1",
    '   Devolvió: {"exit":1,"out":"falló"}',
  ]);
});
it("cuts a long receipt at 4000 characters and says how many were left out", () => {
  const lines = tell("x".repeat(5000));
  expect(lines[2]).toBe(`   Devolvió: "${"x".repeat(3999)}`);
  expect(lines[3]).toBe("   Recortado; caracteres que faltan: 1002");
});
it("never leaves half a character where it cuts", () => {
  const lines = tell(`${"a".repeat(3998)}😀${"b".repeat(10)}`);
  const returned = lines[2] ?? "";
  // A lone surrogate, half an emoji, would not survive a round trip through UTF-8.
  expect(new TextDecoder().decode(new TextEncoder().encode(returned))).toBe(returned);
  expect(returned.endsWith("a")).toBe(true);
  expect(lines[3]).toBe("   Recortado; caracteres que faltan: 12");
});
it("never tells the read act's targets as menu changes: they change with every object", () => {
  const input = Type.Object({});
  const read = (target: string) => ({ tool: "mind", act: "read", target, input, scope: "read" as const });
  const lines = resultsText("es", [], 5, { before: [read("a")], after: [read("a"), read("b"), read("c")] });
  expect(lines).not.toContain("read");
});
