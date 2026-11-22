// Proves that a message waits for a mind only when said after its last turn opened, so a new rule wakes nobody for
// the past, and that no restart loses a message: to a mind that never had a turn, every message waits.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { effect, type HouseEmission } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { pendingMindWakes } from "./mind-schedule.ts";
import type { WakePolicy } from "./mind-wake-policy.ts";
import {
  requestMindFixture,
  answer,
  send,
  history,
  type RequestHouse,
} from "../../../tests/support/request-mind-fixture.ts";
const reads = Type.Object({ text: Type.String(), to: Type.String() });
const policy: WakePolicy = {
  scope: { kind: "consciousness", actor: "mind:notes" },
  name: "Notas",
  message: event =>
    event.layer === "program" && Value.Check(reads, event.data)
      ? { text: event.data.text, to: event.data.to.split(","), by: event.by }
      : undefined,
  toolOf: target => target.split("/")[0],
  talks: false,
};
type At = (seq: number) => Event;
const journal = (...items: readonly At[]): Event[] => items.map((item, index) => item(index + 1));
const fact =
  (emission: HouseEmission): At =>
  seq => ({ ...emission, id: `e${seq}`, seq, at: 0 });
const said = (by: string, text: string, to = "mind:notes") =>
  ({ layer: "program", kind: "talk/said", data: { to, text }, by, cause: [] }) as const;
const line =
  (by: string, text: string): At =>
  seq => ({ ...said(by, text), id: `e${seq}`, seq, at: 0 });
const boot = fact(effect("boot", {}, "distribution"));
const added = fact(effect("act", { object: "notes/personal", option: "personal/add", input: {} }, "ana"));
const turn = (id: string, wake: string[]) => [
  fact(effect("mind-turn-opened", { turn: id, wake }, "mind:notes", wake)),
  fact(effect("mind-turn-closed", { turn: id, outcome: "done", calls: 1, applied: [] }, "mind:notes")),
];
const wakes = (events: readonly Event[]) => pendingMindWakes([policy], events, 0).map(each => each.wake);
it("22/11: a line said before the mind's last turn opened is not pending, though no turn consumed it", () => {
  const events = journal(
    boot,
    line("ana", "Anotá uno"),
    ...turn("t1", ["e2"]),
    line("mind:migration", "Listo, migré todo"),
    added,
    ...turn("t2", ["e6"]),
  );
  expect(wakes(events)).toEqual([]);
});
it("22/11: a line said after the mind's last turn opened waits for it, also across a restart", () => {
  const events = journal(boot, line("ana", "Anotá uno"), ...turn("t1", ["e2"]), boot, line("mind:migration", "Listo"));
  expect(wakes(events)).toEqual([["e6"]]);
});
it("22/11: a mind that never had a turn loses no message to a boot: every line addressed to it waits", () => {
  expect(wakes(journal(boot, line("ana", "hello"), boot))).toEqual([["e2"]]);
  expect(wakes(journal(boot, line("mind:migration", "Listo, migré todo"), boot, line("ana", "Anotá")))).toEqual([
    ["e2", "e4"],
  ]);
});
it("22/11: the frontier is for messages only: an act on its own tool before the boot still wakes it", () => {
  expect(wakes(journal(boot, added, boot))).toEqual([["e2"]]);
});
const fixtures: ReturnType<typeof requestMindFixture>[] = [];
const fixture = () => {
  const f = requestMindFixture();
  fixtures.push(f);
  return f;
};
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("network forbidden");
    }),
  ),
);
afterEach(() => {
  fixtures.splice(0).forEach(f => f.cleanup());
  vi.unstubAllGlobals();
});
const flush = async (house: RequestHouse) => (await house.minds)?.flush();
const migrated = (house: RequestHouse) => house.bus.emit(said("mind:migration", "Listo, migré todo"));
const opened = (house: RequestHouse) =>
  [...house.tools.state().house.minds.turns.values()].map(each => each.opened.data.wake);
it("22/11: an old journal's unnamed mind line, said before the mind's last turn opened, makes no call", async () => {
  const f = fixture();
  // Written without minds, as the code of 316677a4 wrote it: that line woke nobody then, and a later turn of the mind,
  // opened for another line, had it in front of it without taking it.
  const old = await f.open(false);
  migrated(old);
  const asked = send(old, "mind:notes", "Anotá uno");
  expect(asked.status).toBe("accepted");
  const wake = [history(old).findLast(e => e.layer === "program" && e.by === "ana")?.id ?? "missing"];
  old.bus.emit(effect("mind-turn-opened", { turn: "t-old", wake }, "mind:notes", wake));
  old.bus.emit(effect("mind-turn-closed", { turn: "t-old", outcome: "done", calls: 1, applied: [] }, "mind:notes"));
  old.close();
  f.respond(() => answer());
  const house = await f.open();
  await flush(house);
  expect(f.transport).toHaveBeenCalledTimes(0);
  expect(opened(house)).toEqual([wake]);
}, 60000);
it("22/11: a line to a mind that never had a turn, said before a restart, wakes it at the next boot", async () => {
  const f = fixture();
  const old = await f.open(false);
  migrated(old);
  old.close();
  f.respond(() => answer());
  const house = await f.open();
  await flush(house);
  expect(f.transport).toHaveBeenCalledTimes(1);
  expect(opened(house)).toHaveLength(1);
}, 60000);
it("22/11: a line said while the mind's turn runs wakes it once that turn closes", async () => {
  const f = fixture();
  const house = await f.open();
  f.prepare(house);
  let first = true;
  f.respond(() => {
    if (first) expect(send(house, "mind:notes", "Y otra cosa").status).toBe("accepted");
    first = false;
    return answer();
  });
  expect(send(house, "mind:notes", "Anotá uno").status).toBe("accepted");
  await flush(house);
  expect(f.transport).toHaveBeenCalledTimes(2);
  const text = new Map(history(house).map(e => [e.id, JSON.stringify(e.data)]));
  expect(opened(house).map(wake => wake.map(id => text.get(id)))).toEqual([
    [JSON.stringify({ to: "mind:notes", text: "Anotá uno" })],
    [JSON.stringify({ to: "mind:notes", text: "Y otra cosa" })],
  ]);
}, 60000);
it("22/11: a line said after the mind's last turn wakes it at the next boot: a restart loses nothing", async () => {
  const f = fixture();
  const first = await f.open();
  f.prepare(first);
  f.respond(() => answer());
  expect(send(first, "mind:notes", "Anotá uno").status).toBe("accepted");
  await flush(first);
  first.close();
  const quiet = await f.open(false);
  expect(send(quiet, "mind:notes", "Anotá dos").status).toBe("accepted");
  migrated(quiet);
  quiet.close();
  const house = await f.open();
  await flush(house);
  expect(f.transport).toHaveBeenCalledTimes(2);
  expect(opened(house).at(-1)).toHaveLength(2);
}, 60000);
