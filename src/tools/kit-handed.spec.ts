import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { allowedAct } from "../house/kit.ts";
import { effect } from "../house/facts.ts";
import { startHouse } from "../runtime/house-runtime.ts";
import { toolAct } from "./act-definition.ts";
import type { ActContext, ActResult, Tool } from "./tool-contract.ts";
import { deferred, runningRig, saved, settled } from "../../tests/support/kit-running.ts";
import { shop, shopProgram, shopRegistry, type Shop } from "../../tests/support/shop.ts";

it.each(["house", "world"] as const)("R10: handing over administration cuts the signal of the %s act", async reach => {
  const home = mkdtempSync(join(tmpdir(), "kit-handed-"));
  const contexts: ActContext<Shop>[] = [];
  const done = deferred<ActResult<Shop>>();
  const run = toolAct<Shop, ReturnType<typeof Type.Object>>(
    Type.Object({}),
    (_, context) => {
      contexts.push(context);
      return done.promise;
    },
    reach,
  );
  const slow: Tool<Shop> = {
    id: "slow",
    facts: ["slow-written"],
    purpose: "Prueba del traspaso",
    targets: () => [],
    view: () => "",
    summary: () => "",
    acts: { run },
  };
  const house = startHouse(home, {
    ...shopProgram,
    registry: [...shopRegistry, slow],
    by: "shop",
    identities: true,
    creation: { admin: "ana", assignments: [{ identity: "beto", tools: ["slow"] }] },
  });
  try {
    house.tools.act({ act: "attend", input: { target: "slow" } }, 0, "ana");
    const pending = house.tools.act({ act: "run", target: "slow", input: {} }, 0, "ana");
    expect(pending.status).toBe("processing");
    house.bus.emit(effect("handed", { to: "beto" }, "ana"));
    expect(allowedAct(house.tools.state().house, "ana", "slow", "run")).toBe(false);
    expect(contexts[0]?.signal?.aborted).toBe(true);
    done.resolve({ ...saved, effects: [shop.fact("slow-written", { sale: "handover", total: 1 }, "ana")] });
    expect(await settled(pending)).toMatchObject({
      status: reach === "world" ? "accepted" : "interrupted",
      reason: "sacada",
    });
    expect(house.tools.state().tools.sales.has("handover")).toBe(reach === "world");
  } finally {
    house.close();
    rmSync(home, { recursive: true, force: true });
  }
});

it.each(["granted", "removed"] as const)("M4: %s cuts the signal before another external effect", async kind => {
  const rig = runningRig("world");
  try {
    const pending = rig.start();
    if (kind === "granted") rig.bus.emit(effect("granted", { identity: "beto", tools: [] }, "ana"));
    else rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
    expect(rig.calls[0]?.context.signal?.aborted).toBe(true);
    expect(() => rig.calls[0]?.context.signal?.throwIfAborted()).toThrow("sacada");
    rig.calls[0]?.done.resolve(saved);
    expect(await settled(pending)).toMatchObject({ status: "accepted", reason: "sacada" });
    expect(rig.outside).toEqual(["hecho afuera"]);
  } finally {
    rig.close();
  }
});
