import { journalTexts } from "../texts/journal.texts.ts";
import { emitUnchecked } from "../../tests/support/startup-forge.ts";
import { afterEach, expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shop, shopRegistry } from "../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
it("a self-caused chain yields to a person and stops at 32 acts with a visible refusal", async () => {
  const mind = zeroMind();
  const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
  let n = 0;
  let personAt = -1;
  let finish: (value: unknown) => void = () => {};
  const stopped = new Promise(resolve => {
    finish = resolve;
  });
  mind.startup().bus.on("mind-noted", e => {
    if (e.by !== "mind:desk") return;
    n++;
    if (n === 1)
      setTimeout(() => {
        personAt = n;
        rig.attend("ana", "sales");
      }, 0);
    if (n > 40) {
      finish(undefined);
      return;
    }
    void mind.act().then(r => {
      if (r.status === "rejected") finish(r);
    });
  });
  await mind.act();
  expect(await stopped).toMatchObject({ status: "rejected", reason: journalTexts.mindChain });
  expect(n).toBe(32);
  expect(personAt).toBeGreaterThan(0);
  expect(personAt).toBeLessThan(32);
  expect(await mind.act("scene", { general: "otro pedido" }, "me")).toStrictEqual({ status: "accepted" });
});
it("rev2-loop: a program fact cannot start a bus feedback loop", () => {
  const mind = zeroMind();
  const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
  rigs.push(rig);
  let n = 0;
  const fact = shop.fact("sale-registered", { sale: "fake", total: 1 }, "mind:desk");
  mind.startup().bus.on("sale-registered", () => {
    if (n++ < 300) emitUnchecked(mind.startup().bus, fact);
  });
  expect(() => emitUnchecked(mind.startup().bus, fact)).toThrow(/act/);
  expect(n).toBe(0);
  expect(rig.facts().filter(e => e.layer === "program")).toEqual([]);
});
