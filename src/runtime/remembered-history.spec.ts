// The history a mind schedule reads is remembered, grows by its tail and never holds what a journal lost.
import { expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { Bus } from "../journal/bus.ts";
import type { Emission, Event } from "../journal/vocabulary.ts";
import { rememberedHistory } from "./remembered-history.ts";
function rig() {
  const stored: Event[] = [];
  const reads: number[] = [];
  let ids = 0;
  const journal = {
    replay: <S>(initial: S, reduce: (state: S, event: Event) => S, after = 0): S => {
      reads.push(after);
      return stored.filter(event => event.seq > after).reduce(reduce, initial);
    },
  };
  const append = (emission: Emission): Event => {
    const event: Event = { ...emission, id: `e${++ids}`, seq: stored.length + 1, at: 0 };
    stored.push(event);
    return event;
  };
  const bus = new Bus(append, write => {
    const kept = stored.length;
    try {
      return write();
    } catch (error) {
      stored.splice(kept);
      throw error;
    }
  });
  const say = (text: string) => bus.emit(effect("scene", { general: text, to: {} }, "ana"));
  return { stored, reads, bus, say, history: rememberedHistory(journal, bus) };
}
it("reads the whole journal once and afterwards only what was appended", () => {
  const r = rig();
  r.say("one");
  r.say("two");
  const first = r.history();
  expect(first.map(event => event.seq)).toEqual([1, 2]);
  expect(r.history()).toBe(first);
  r.say("three");
  const grown = r.history();
  expect(grown.map(event => event.seq)).toEqual([1, 2, 3]);
  expect(first).toHaveLength(2);
  expect(r.reads).toEqual([0, 1, 1]);
});
it("forgets a fact whose write rolled back, even when it was read in between", () => {
  const r = rig();
  r.say("kept");
  expect(r.history()).toHaveLength(1);
  expect(() =>
    r.bus.together(() => {
      r.say("lost");
      expect(r.history()).toHaveLength(2);
      throw new Error("refused");
    }),
  ).toThrow("refused");
  expect(r.history().map(event => event.seq)).toEqual([1]);
  r.say("after");
  expect(r.history().map(event => event.id)).toEqual(["e1", "e3"]);
});
it("reads everything again when its last fact is no longer the journal's", () => {
  const r = rig();
  r.say("one");
  r.say("two");
  expect(r.history()).toHaveLength(2);
  const replaced = r.stored.pop();
  if (!replaced) throw new Error("fixture");
  r.stored.push({ ...replaced, id: "other" });
  expect(r.history().map(event => event.id)).toEqual(["e1", "other"]);
});
