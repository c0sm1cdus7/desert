import { Type } from "@sinclair/typebox";
import { afterEach, expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { toolAct } from "../tools/act-definition.ts";
import { OutsideDefect } from "../fields/program-call.ts";
import type { Tool } from "../tools/tool-contract.ts";
import { deferred, settled } from "../../tests/support/kit-running.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../tests/support/shop.ts";

const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
function open(wrapped: boolean, failure: "defect" | "cut", reach: "house" | "world" = "house") {
  const gate = deferred<undefined>();
  const run = toolAct<Shop, ReturnType<typeof Type.Object>>(
    Type.Object({}),
    async (_, context) => {
      await gate.promise;
      try {
        if (failure === "cut") context.signal?.throwIfAborted();
        throw new Error("defecto real del programa");
      } catch (error) {
        throw wrapped ? new OutsideDefect(error) : error;
      }
    },
    reach,
  );
  const desk: Tool<Shop> = {
    id: "desk",
    purpose: "Prueba de diagnóstico",
    targets: () => [],
    view: () => "",
    summary: () => "",
    acts: { run },
  };
  const rig = shopRig({ registry: [...shopRegistry, desk] });
  rigs.push(rig);
  rig.attend("beto", "desk");
  const start = () => rig.act("beto", "run", {}, "desk");
  const cut = () => rig.bus.emit(effect("kit-set", { holder: "beto", tool: "desk", acts: [] }, "ana"));
  return { rig, start, gate, cut };
}

it.each([false, true])("R3: conserva diagnóstico y atención del defecto, envuelto=%s", async wrapped => {
  for (const reach of ["house", "world"] as const) {
    for (const cut of [false, true]) {
      const test = open(wrapped, "defect", reach);
      const pending = test.start();
      if (cut) test.cut();
      test.gate.resolve(undefined);
      const result = await settled(pending);
      expect(result).toMatchObject({ status: cut ? "interrupted" : "rejected", defect: true });
      if (cut) expect(result.reason).toBe("sacada");
      const entries = test.rig.state().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0]?.data.diagnostic).toContain("defecto real del programa");
      expect(test.rig.state().attentionBy.get("ana")?.has("desk")).toBe(true);
      expect(test.rig.facts().findLast(event => event.kind === "act-result")?.data).toMatchObject({
        status: result.status,
        reason: result.reason,
        defect: true,
      });
    }
  }
});

it.each([false, true])("el motivo de la señal no es un defecto, envuelto=%s", async wrapped => {
  const test = open(wrapped, "cut");
  const pending = test.start();
  test.cut();
  test.gate.resolve(undefined);
  const result = await settled(pending);
  expect(result).toMatchObject({ status: "interrupted", reason: "sacada", effects: [] });
  expect(result.defect).toBeUndefined();
  expect(test.rig.state().entries).toEqual([]);
});
