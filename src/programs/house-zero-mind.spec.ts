import { afterEach, expect, it, vi } from "vitest";
import { zeroHouse } from "../../tests/support/zero-house.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shop } from "../../tests/support/shop.ts";
import { effect } from "../journal/events.ts";
import { object } from "../catalogs/acts.ts";
import { toolAct } from "../tools/act-definition.ts";
import { toolTexts } from "../texts/tools.texts.ts";
afterEach(() => vi.useRealTimers());
it("a persisted and overdue schedule wakes once across house close and reopen", async () => {
  vi.useFakeTimers();
  const rig = zeroHouse();
  rig.kit(["write"]);
  const scheduled = rig.mind.schedule(Date.now() + 20);
  rig.house().close();
  await vi.advanceTimersByTimeAsync(30);
  rig.restart();
  await vi.advanceTimersByTimeAsync(1);
  expect(await rig.mind.pending.at(-1)).toMatchObject({ status: "accepted" });
  rig.restart();
  await vi.advanceTimersByTimeAsync(100);
  const wakes = rig.facts().filter(event => event.kind === "woke" && event.data.id === "desk:zero");
  expect(wakes).toHaveLength(1);
  expect(wakes[0]?.cause).toEqual([scheduled.id]);
  expect(rig.facts().filter(event => event.kind === "act" && event.cause.includes(wakes[0]?.id ?? ""))).toHaveLength(1);
});
it("restart closes a mind act in flight as interrupted, without writing its late effects", async () => {
  let release = () => {},
    entered = () => {};
  const wait = new Promise<void>(resolve => {
    release = resolve;
  });
  const started = new Promise<void>(resolve => {
    entered = resolve;
  });
  const mind = zeroMind("desk", {
    write: toolAct(object({}), async (_, { by }) => {
      entered();
      await wait;
      return { status: "accepted", effects: [shop.fact("sale-registered", { sale: "late", total: 1 }, by)] };
    }),
  });
  const rig = zeroHouse(mind);
  rig.kit(["write"]);
  const pending = mind.act();
  await started;
  const act = rig.facts().find(event => event.kind === "act" && event.by === "mind:desk");
  expect(act).toBeDefined();
  rig.restart();
  release();
  expect(await pending).toMatchObject({ status: "rejected", reason: toolTexts.interrupted });
  const results = rig.facts().filter(event => event.kind === "act-result" && event.data.act === act?.id);
  expect(results).toHaveLength(1);
  expect(results[0]).toMatchObject({ by: "mind:desk", data: { status: "interrupted", reason: toolTexts.interrupted } });
  expect(rig.facts().filter(event => event.kind === "sale-registered")).toEqual([]);
});

it("a wake consumed in the closing task is recovered once from business state on reopen", async () => {
  const rig = zeroHouse();
  rig.kit(["write"]);
  rig.house().bus.emit(effect("woke", { id: "desk:zero" }, "shop"));
  rig.restart();
  expect(await rig.mind.pending[0]).toMatchObject({ status: "rejected", reason: toolTexts.interrupted });
  expect(await rig.mind.pending[1]).toStrictEqual({ status: "accepted" });
  rig.restart();
  expect(rig.mind.pending).toHaveLength(2);
  expect(rig.facts().filter(e => e.kind === "sale-registered")).toHaveLength(1);
});
it("the actual clock can deliver and close in one task; reopening completes business work once", async () => {
  vi.useFakeTimers();
  const rig = zeroHouse();
  rig.kit(["write"]);
  rig.mind.schedule(Date.now() + 10);
  rig.house().bus.on("woke", event => {
    if (event.data.id === "desk:zero") rig.restart();
  });
  await vi.advanceTimersByTimeAsync(20);
  expect(await rig.mind.pending[0]).toMatchObject({ status: "rejected", reason: toolTexts.interrupted });
  expect(await rig.mind.pending[1]).toStrictEqual({ status: "accepted" });
  rig.restart();
  await vi.advanceTimersByTimeAsync(20);
  const facts = rig.facts(),
    ids = new Set(facts.map(e => e.id));
  expect(facts.filter(e => e.kind === "woke")).toHaveLength(1);
  expect(facts.filter(e => e.kind === "sale-registered")).toHaveLength(1);
  expect(facts.flatMap(e => e.cause).every(id => ids.has(id))).toBe(true);
});
