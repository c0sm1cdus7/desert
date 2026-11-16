import { emitUnchecked } from "../../tests/support/startup-forge.ts";
import { afterEach, expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
function opened() {
  const mind = zeroMind();
  const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
  return { rig, mind };
}
function intact(rig: ReturnType<typeof shopRig>) {
  const facts = rig.facts();
  const ids = new Set(facts.map(e => e.id));
  expect(facts.flatMap(e => e.cause).every(id => ids.has(id))).toBe(true);
}
it("deshecho: an act caused by a rolled back sale never executes", async () => {
  const { rig, mind } = opened();
  rig.attend("ana", "sales");
  const pending: ReturnType<typeof mind.act>[] = [];
  mind.startup().bus.on("sale-registered", e => {
    if (e.by === "ana") pending.push(mind.act());
  });
  rig.bus.on("sale-registered", e => {
    if (e.by === "ana") throw new Error("rollback");
  });
  expect(rig.act("ana", "register", { sale: "s", total: 1 }, "sales").status).toBe("rejected");
  expect(await pending[0]).toMatchObject({ status: "rejected" });
  expect(rig.facts().filter(e => e.by === "mind:desk")).toEqual([]);
  intact(rig);
});
for (const emits of [false, true])
  it(`together: rollback cancels a request even without a heard fact (${emits})`, async () => {
    const { rig, mind } = opened();
    let pending: ReturnType<typeof mind.act> | undefined;
    expect(() =>
      mind.startup().bus.together(() => {
        if (emits) rig.bus.emit(effect("scene", { general: "dentro" }, "ana"));
        pending = mind.act();
        throw new Error("rollback");
      }),
    ).toThrow("BaseFailure");
    expect(await pending).toMatchObject({ status: "rejected" });
    expect(rig.facts().filter(e => e.by === "mind:desk")).toEqual([]);
    intact(rig);
  });
it("a continuation born hearing A keeps A when B releases it", async () => {
  const { rig, mind } = opened();
  let release = () => {};
  let pending: ReturnType<typeof mind.act> | undefined;
  mind.startup().bus.on("woke", e => {
    if (e.data.id === "A")
      pending = new Promise<void>(resolve => {
        release = resolve;
      }).then(() => mind.act());
    else release();
  });
  const a = rig.bus.emit(effect("woke", { id: "A" }, "shop"));
  rig.bus.emit(effect("woke", { id: "B" }, "shop"));
  expect(await pending).toStrictEqual({ status: "accepted" });
  expect(rig.facts().find(e => e.kind === "act")?.cause).toEqual([a.id]);
  intact(rig);
});
it("unreadable data always resolves with the house invalid-data refusal", async () => {
  const { mind } = opened();
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  const getter = Object.defineProperty({}, "act", {
    enumerable: true,
    get: () => {
      throw new Error("getter");
    },
  });
  for (const value of [{ act: "write", input: cyclic }, { act: "write", input: { n: 1n } }, getter])
    await expect(mind.startup().act(value)).resolves.toStrictEqual({ status: "rejected", reason: toolTexts.invalid });
});

it("a forged kit cannot open act after its first denial", async () => {
  const { rig, mind } = opened();
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: [] }, "ana"));
  expect(await mind.act()).toMatchObject({ reason: toolTexts.outsideKit });
  const forged = effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana");
  expect(() => emitUnchecked(mind.startup().bus, forged)).toThrow(/act/);
  expect(await mind.act()).toMatchObject({ reason: toolTexts.outsideKit });
  expect(rig.facts().filter(e => e.layer === "program")).toEqual([]);
});

it("a continuation remembers an outer rollback after its inner together had returned", async () => {
  const { rig, mind } = opened();
  let release = () => {};
  let pending: ReturnType<typeof mind.act> | undefined;
  mind.startup().bus.on("stimulus", () => {
    pending = new Promise<void>(resolve => {
      release = resolve;
    }).then(() => mind.act());
  });
  expect(() =>
    rig.bus.together(() => {
      rig.bus.together(() => rig.bus.emit(effect("stimulus", { tool: "desk" }, "shop")));
      throw new Error("rollback");
    }),
  ).toThrow("rollback");
  release();
  expect(await pending).toMatchObject({ status: "rejected" });
  expect(rig.facts().filter(e => e.by === "mind:desk")).toEqual([]);
  intact(rig);
});
it("through is captured when asked, before later facts change the state", async () => {
  const { rig, mind } = opened();
  const through = rig.state().through;
  const pending = mind.act();
  rig.bus.emit(effect("scene", { general: "después" }, "ana"));
  expect(await pending).toStrictEqual({ status: "accepted" });
  expect(rig.facts().find(e => e.kind === "act")?.data.through).toBe(through);
});

it("serialization cannot erase extra envelope fields and make a forbidden request valid", async () => {
  const { rig, mind } = opened();
  const before = rig.facts();
  expect(await mind.startup().act({ act: "write", target: "desk", input: {}, by: undefined })).toStrictEqual({
    status: "rejected",
    reason: toolTexts.invalid,
  });
  expect(rig.facts()).toEqual(before);
});

it("JSON omissions and substitutions are invalid; hidden envelope fields stay forbidden", async () => {
  const { rig, mind } = opened();
  const before = rig.facts();
  const hidden = Object.defineProperty({ act: "write", target: "desk", input: {} }, "by", { value: "ana" });
  for (const value of [
    hidden,
    ...[() => {}, Symbol("x"), undefined, NaN, Infinity, { [Symbol("x")]: 1 }].map(item => ({
      act: "write",
      target: "desk",
      input: { item },
    })),
  ]) {
    expect(await mind.startup().act(value)).toStrictEqual({ status: "rejected", reason: toolTexts.invalid });
  }
  expect(rig.facts()).toEqual(before);
});
