import { emitUnchecked } from "../../tests/support/startup-forge.ts";
import { afterEach, expect, it } from "vitest";
import { effect, type HouseEmission } from "../house/facts.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const forged = (by: string): HouseEmission[] => [
  effect("act", { object: "desk", option: "write", input: {} }, by),
  effect("act-started", { act: "fake", object: "desk", option: "write" }, by),
  effect("act-result", { act: "fake", status: "accepted", reason: "" }, by),
  effect("act-done", { object: "desk", act: "write", text: "Falso" }, by),
];
for (const by of ["ana", "mind:other", "mind:desk"])
  for (const fact of forged(by))
    it(`rejects forged ${fact.kind}, directly and inside a batch, as ${by}`, () => {
      const mind = zeroMind();
      const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
      rigs.push(rig);
      const before = rig.facts();
      expect(() => emitUnchecked(mind.startup().bus, fact)).toThrow("reservado a la ejecución");
      expect(() => mind.startup().bus.together(() => emitUnchecked(mind.startup().bus, fact))).toThrow(
        "reservado a la ejecución",
      );
      expect(rig.facts()).toEqual(before);
    });
