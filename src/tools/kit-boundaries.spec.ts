import { Type } from "@sinclair/typebox";
import { afterEach, expect, it } from "vitest";
import { effect } from "../journal/events.ts";
import { ownAct } from "./act-definition.ts";
import { deferred, runningRig, saved, settled } from "../../tests/support/kit-running.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import type { ActContext, ActResult } from "./tool-contract.ts";
import { shop, type Shop } from "../../tests/support/shop.ts";

const rigs: { close(): void }[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));

it("finish comprueba el kit incluso si el cambio no pasó por el oyente", async () => {
  const rig = runningRig();
  rigs.push(rig);
  const pending = rig.start();
  rig.journal.append(effect("kit-set", { holder: "beto", tool: "slow", acts: [] }, "ana"), 5000);
  expect(rig.calls[0]?.context.signal?.aborted).toBe(false);
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(pending)).toMatchObject({ status: "interrupted", reason: "sacada", effects: [] });
  expect(rig.state().entries).toEqual([]);
});

it("el kit no corta lo que la casa ofrece directamente, aunque nombre una herramienta", async () => {
  const done = deferred<ActResult<Shop>>();
  const contexts: ActContext<Shop>[] = [];
  const own = ownAct<Shop, ReturnType<typeof Type.Object>>(
    "sales",
    "own",
    { input: Type.Object({}), purpose: "Prueba de casa" },
    (_, context) => {
      contexts.push(context);
      return done.promise;
    },
  );
  const rig = shopRig({ own: () => [own] });
  rigs.push(rig);
  const pending = rig.act("beto", "own", {}, "sales");
  rig.bus.emit(effect("granted", { identity: "beto", tools: [] }, "ana"));
  expect(contexts[0]?.signal?.aborted).toBe(false);
  done.resolve({ status: "accepted", effects: [shop.fact("sale-registered", { sale: "propia", total: 1 }, "beto")] });
  expect(await settled(pending)).toMatchObject({ status: "accepted" });
  expect(rig.state().tools.sales.get("propia")?.by).toBe("beto");
});

it("un padre cortado no inicia otro acto aunque la otra acción siga dada", async () => {
  const rig = runningRig();
  rigs.push(rig);
  rig.attend("beto", "sales");
  const pending = rig.start();
  rig.kit("beto");
  rig.kit("beto", null);
  const nested = rig.calls[0]?.context.execute?.({
    act: "register",
    target: "sales",
    input: { sale: "s1", total: 100 },
  });
  await expect(nested).resolves.toMatchObject({ status: "interrupted", reason: "sacada" });
  expect(rig.state().tools.sales.has("s1")).toBe(false);
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(pending)).toMatchObject({ status: "interrupted", reason: "sacada" });
});
