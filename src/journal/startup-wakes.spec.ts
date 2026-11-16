import { emitUnchecked } from "../../tests/support/startup-forge.ts";
import { afterEach, expect, it, vi } from "vitest";
import { effect } from "../house/facts.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => {
  rigs.splice(0).forEach(rig => rig.close());
  vi.useRealTimers();
});
for (const at of [null, 0])
  it(`another tool cannot cancel or replace a wake (${at})`, async () => {
    vi.useFakeTimers();
    const desk = zeroMind(),
      other = zeroMind("other", undefined, []);
    const rig = shopRig({ registry: [...shopRegistry, desk.tool, other.tool] });
    rigs.push(rig);
    const scheduled = desk.schedule(Date.now() + 20);
    expect(scheduled.by).toBe("mind:desk");
    const before = rig.facts();
    expect(() => other.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:zero", at } })).toThrow(
      /act/,
    );
    expect(() => emitUnchecked(other.startup().bus, effect("woke", { id: "desk:zero" }, "shop"))).toThrow(/act/);
    expect(rig.facts()).toEqual(before);
    rig.restart();
    await vi.advanceTimersByTimeAsync(30);
    expect(desk.pending).toHaveLength(1);
    expect(rig.facts().filter(e => e.kind === "woke")).toHaveLength(1);
  });
it("a wake with the correct prefix still cannot choose an identity author", () => {
  const desk = zeroMind();
  const rig = shopRig({ registry: [...shopRegistry, desk.tool] });
  rigs.push(rig);
  const before = rig.facts();
  expect(() => emitUnchecked(desk.startup().bus, effect("wake-at", { id: "desk:zero", at: 0 }, "ana"))).toThrow(/act/);
  expect(rig.facts()).toEqual(before);
});
it("encoded tool names keep nested prefixes from colliding", () => {
  const parent = zeroMind("a"),
    child = zeroMind("a:b", undefined, []);
  const rig = shopRig({ registry: [...shopRegistry, parent.tool, child.tool] });
  rigs.push(rig);
  const wake = { layer: "house" as const, kind: "wake-at" as const, data: { id: "a%3Ab:zero", at: null } };
  expect(child.startup().bus.emit(wake).by).toBe("mind:a:b");
  expect(() => parent.startup().bus.emit(wake)).toThrow(/act/);
  expect(() => child.startup().bus.emit({ ...wake, data: { id: "a:b:zero", at: null } })).toThrow(/act/);
});
it("historical ownership wins over a new prefix, survives cancellation and restart", () => {
  const desk = zeroMind(),
    other = zeroMind("other", undefined, []);
  const rig = shopRig({ registry: [...shopRegistry, desk.tool, other.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("wake-at", { id: "other:old", at: null }, "mind:desk"));
  rig.bus.emit(effect("wake-at", { id: "other:old", at: null }, "mind:other"));
  rig.restart();
  const wake = { layer: "house" as const, kind: "wake-at" as const, data: { id: "other:old", at: null } };
  expect(() => other.startup().bus.emit(wake)).toThrow(/act/);
  expect(desk.startup().bus.emit(wake).by).toBe("mind:desk");
  rig.restart();
  expect(() => other.startup().bus.emit(wake)).toThrow(/act/);
});
it("even a tool named attention cannot preempt a person's reminder", () => {
  const mind = zeroMind("attention");
  const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
  rigs.push(rig);
  const before = rig.facts();
  expect(() =>
    mind.startup().bus.emit({
      layer: "house",
      kind: "wake-at",
      data: {
        id: 'attention:["ana","sales"]',
        at: null,
      },
    }),
  ).toThrow(/act/);
  expect(rig.facts()).toEqual(before);
  expect(mind.schedule(null).by).toBe("mind:attention");
});
