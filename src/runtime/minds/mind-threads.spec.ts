import { expect, it } from "vitest";
import {
  appendThread,
  putThread,
  threadFor,
  threadWindow,
} from "../../../tests/support/retired-helpers/mind-threads.ts";
import { threadStep } from "./mind-threads.ts";
it("keeps later arrivals and references across compaction", () => {
  const events = [
    { seq: 1, id: "a", text: "uno" },
    { seq: 2, id: "b", text: "dos" },
    { seq: 3, id: "c", text: "tres" },
  ];
  const thread = threadStep({ entries: events, compacted: [] }, { through: 2, keep: ["b"] });
  expect(threadWindow(thread).map(entry => entry.id)).toEqual(["b", "c"]);
  expect(thread.compacted[0]).toEqual({ through: 2, keep: ["b"], omitted: ["a"] });
});
it("never drops an arrival made after compaction even inside the old interval", () => {
  const thread = threadStep({ entries: [{ seq: 1, id: "a", text: "uno" }], compacted: [] }, { through: 2, keep: [] });
  const arrived = { ...thread, entries: [...thread.entries, { seq: 2, id: "late", text: "tarde" }] };
  expect(threadWindow(arrived).map(entry => entry.id)).toEqual(["late"]);
  expect(thread.compacted[0]?.omitted).toEqual(["a"]);
});
it("rejects a reference outside the compacted interval", () => {
  expect(() =>
    threadStep({ entries: [{ seq: 3, id: "future", text: "tres" }], compacted: [] }, { through: 2, keep: ["future"] }),
  ).toThrow("Invalid thread references");
});
it("separates the consciousness and journeys of different minds", () => {
  const empty = { entries: [], compacted: [] };
  const a = { actor: "assistant:franco" };
  const b = { actor: "assistant:franco", process: "trip" };
  const c = { actor: "mind:notes", process: "trip" };
  const bank = putThread(
    putThread(putThread(new Map(), a, appendThread(empty, { seq: 1, id: "a", text: "uno" })), b, empty),
    c,
    empty,
  );
  expect(threadWindow(threadFor(bank, a)).map(entry => entry.id)).toEqual(["a"]);
  expect(threadWindow(threadFor(bank, b))).toEqual([]);
  expect(threadWindow(threadFor(bank, c))).toEqual([]);
  expect(() => threadFor(bank, { actor: "mind:other" })).toThrow("Hilo ausente");
});
