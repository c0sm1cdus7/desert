import { afterEach, expect, it } from "vitest";
import { object } from "../../fields/visible-text.ts";
import { effect } from "../../house/facts.ts";
import { toolAct } from "../act-definition.ts";
import type { ActContext, ActResult, Tool } from "../tool-contract.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { type Shop } from "../../../tests/support/shop.ts";
import { deferred, settled } from "../../../tests/support/kit-running.ts";
import { coreRegistry } from "./identities.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
it.each(["delegate-assistant", "disable-assistant", "remove"])(
  "%s corta un acto pendiente y su anidado por el acto real",
  async act => {
    const calls: { context: ActContext<Shop>; done: ReturnType<typeof deferred<ActResult<Shop>>> }[] = [];
    const run = toolAct<Shop, ReturnType<typeof object>>(object({}), (_, context) => {
      const done = deferred<ActResult<Shop>>();
      calls.push({ context, done });
      return done.promise;
    });
    const tool: Tool<Shop> = {
      id: "slow",
      purpose: "Espera de prueba",
      targets: () => [],
      view: () => "Espera",
      summary: () => "Espera",
      acts: { run, other: run },
    };
    const registry = coreRegistry([tool], "shop", true);
    const rig = shopRig({ registry, identities: true, grants: { ana: ["slow"], beto: ["slow"] } });
    rigs.push(rig);
    const on = "identities/beto";
    rig.attend("ana", on);
    rig.attend("beto", on);
    expect((await settled(rig.act("ana", "enable-assistant", { name: "Nora" }, on))).status).toBe("accepted");
    const kit = [{ tool: "slow", acts: ["run", "other"] }];
    expect((await settled(rig.act("beto", "delegate-assistant", { kit }, on))).status).toBe("accepted");
    rig.bus.emit(
      effect(
        "mind-card-assigned",
        { mind: "assistant:beto", card: "synthetic", version: "1", capabilities: [] },
        "ana",
      ),
    );
    const parent = rig.act("assistant:beto", "run", {}, "slow");
    const child = calls[0]?.context.execute?.({ act: "other", target: "slow", input: {} });
    expect(calls).toHaveLength(2);
    expect(
      (
        await settled(
          rig.act(
            act === "delegate-assistant" ? "beto" : "ana",
            act,
            act === "delegate-assistant" ? { kit: [] } : {},
            on,
          ),
        )
      ).status,
    ).toBe("accepted");
    expect(calls.every(call => call.context.signal?.aborted)).toBe(true);
    if (act === "remove") await settled(rig.act("ana", "readmit", {}, on));
    if (act === "disable-assistant") await settled(rig.act("ana", "enable-assistant", { name: "Nora" }, on));
    expect(calls.every(call => call.context.signal?.aborted)).toBe(true);
    calls.forEach(call => call.done.resolve({ status: "accepted", text: "Hecho · Tarde" }));
    expect(await settled(parent)).toMatchObject({ status: "interrupted" });
    expect(await child).toMatchObject({ status: "interrupted" });
    expect(rig.state().entries.filter(e => e.data.tool === "slow")).toEqual([]);
  },
);
