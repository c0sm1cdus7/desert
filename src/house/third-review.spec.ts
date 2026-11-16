import { afterEach, expect, it, vi } from "vitest";
import { effect } from "./facts.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../tests/support/shop.ts";
import { emitUnchecked } from "../../tests/support/startup-forge.ts";
import { startupMind } from "../tools/boundaries/startup-mind.ts";
import { mindInput } from "../tools/boundaries/mind-input.ts";
import { actLimits } from "./own-acts.ts";

const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => {
  rigs.splice(0).forEach(r => r.close());
  vi.restoreAllMocks();
});
function opened() {
  const mind = zeroMind();
  const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
  return { mind, rig };
}
it("rejects values whose JSON representation changes their meaning", async () => {
  const { mind, rig } = opened();
  const getter = Object.defineProperty({}, "x", { enumerable: true, get: () => 1 });
  for (const input of [
    new Map(),
    new Set(),
    new Date(),
    new (class X {
      x = 1;
    })(),
    -0,
    getter,
    { toJSON: () => 1 },
    [1, , 3],
    "x".repeat(2_000_000),
  ]) {
    const before = rig.facts();
    expect(await mind.startup().act({ act: "write", target: "desk", input })).toEqual({
      status: "rejected",
      reason: toolTexts.invalid,
    });
    expect(rig.facts()).toEqual(before);
  }
});
it("counts encoded JSON bytes including escaped text and array contents", () => {
  const envelope = (input: unknown) => ({ act: "write", target: "desk", input });
  const prefix = Buffer.byteLength(JSON.stringify(envelope("")));
  const justFits = "x".repeat(actLimits.inputBytes - prefix);
  expect(mindInput(envelope(justFits))).toEqual(envelope(justFits));
  expect(() => mindInput(envelope(justFits + "x"))).toThrow();
  expect(() => mindInput(envelope("\n".repeat(actLimits.inputBytes / 2)))).toThrow();
  const array = Array.from({ length: 150_000 }, (_, i) => i);
  expect(Buffer.byteLength(JSON.stringify(envelope(array)))).toBeLessThan(actLimits.inputBytes);
  expect(mindInput(envelope(array))).toEqual(envelope(array));
  const extra = Object.assign([1], { other: 2 });
  expect(() => mindInput(envelope(extra))).toThrow();
});
it("rejects an inherited conversion hook on the envelope without invoking it", async () => {
  const { mind, rig } = opened();
  const hook = vi.fn(() => ({ act: "write", target: "desk", input: {} }));
  const envelope = { act: "write", target: "desk", input: {} };
  Object.setPrototypeOf(envelope, { toJSON: hook });
  const before = rig.facts();
  expect(await mind.startup().act(envelope)).toEqual({ status: "rejected", reason: toolTexts.invalid });
  expect(hook).not.toHaveBeenCalled();
  expect(rig.facts()).toEqual(before);
});
it("a cutoff leaves a diagnostic for the administrator", async () => {
  const { mind, rig } = opened();
  let finish: (value: unknown) => void = () => {};
  const stopped = new Promise(resolve => {
    finish = resolve;
  });
  mind.startup().bus.on("mind-noted", e => {
    if (e.by === "mind:desk")
      void mind.act().then(r => {
        if (r.status === "rejected") finish(r);
      });
  });
  await mind.act();
  expect(await stopped).toMatchObject({ reason: journalTexts.mindChain });
  expect(
    rig.facts().filter(e => e.kind === "tool-entry" && e.by === "mind:desk" && e.data.text === journalTexts.mindChain),
  ).toHaveLength(1);
});
it("a wake request rejects extra fields and invalid dates with useful errors", () => {
  const { mind, rig } = opened();
  const bus = mind.startup().bus;
  for (const at of [NaN, -1, 1e300, "bad"]) {
    expect(() => emitUnchecked(bus, { layer: "house", kind: "wake-at", data: { id: "desk:x", at } })).toThrow(
      /inválid/i,
    );
  }
  for (const extra of [{ cause: [] }, { process: "x" }]) {
    expect(() =>
      emitUnchecked(bus, { layer: "house", kind: "wake-at", data: { id: "desk:x", at: null }, ...extra }),
    ).toThrow();
  }
  expect(() => emitUnchecked(bus, { layer: "house", kind: "wake-at", data: { id: "other:x", at: null } })).toThrow(
    /despertar/i,
  );
  expect(() =>
    emitUnchecked(bus, { layer: "house", kind: "wake-at", data: { id: "desk:x", at: null, extra: true } }),
  ).toThrow();
  expect(rig.facts().filter(e => e.kind === "wake-at")).toHaveLength(0);
});
it("a broken scrubber still produces a secret-free diagnostic line", async () => {
  const { rig } = opened();
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const ports = {
    bus: rig.bus,
    registry: shopRegistry,
    state: () => {
      throw Error("sensitive");
    },
    now: Date.now,
    live: () => true,
    process: () => false,
    own: () => [],
    secrets: {
      capture: () => {},
      scrub: () => {
        throw Error("sensitive");
      },
    },
  };
  const mind = startupMind("desk", ports);
  expect(await mind.act({ act: "write", input: {} })).toMatchObject({ reason: toolTexts.baseFailure });
  expect(errors).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(errors.mock.calls)).not.toContain("sensitive");
  mind.close();
});
