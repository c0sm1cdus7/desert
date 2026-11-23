import { holderKit } from "../../house/kit-history.ts";
import { effectiveKit } from "../../house/kit.ts";
import { expect, it } from "vitest";
import { perform, staged } from "./promised-stage.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { keysOf } from "../../doors/terminal/input.ts";
import { allowedAct } from "../../house/kit.ts";
import { kitProgram, kitShown } from "../../../tests/support/kit-program.ts";
import { kitBoundary, boundaryShown } from "../../../tests/support/kit-boundary.ts";
import { programChecks } from "../program-checks.ts";
const change = (act: string, value: string, on = "identities/carla") => ({ act, on, input: { value } });
it("a partial whole-tool row permits both removal and giving all, preserving the unrelated cut", async () => {
  await staged(kitProgram, async ({ house }) => {
    await perform(house(), "identities", change("kit:sales:register", "yes"));
    await perform(house(), "identities", change("kit:payments:receive", "yes"));
    await perform(house(), "identities", change("kit:payments:receive", "no"));
    const core = houseTools(localPorts(house(), "ana", { recentLines: 20 }), kitShown, "es").find(
      tool => tool.id === "identities",
    );
    const whole = core
      ?.view("identities/carla#kit:sales")
      .flatMap(stack => stack.rows)
      .find(row => row.key === "t");
    expect(whole?.detail).toBeUndefined();
    expect(core?.actsOn?.["kit:sales"]?.datum?.("identities/carla")).toBe("Algunas acciones");
    expect((await perform(house(), "identities", change("kit:sales", "no"))).status).toBe("accepted");
    expect(holderKit(house().tools.state().house, "carla").selections).toEqual([]);
    expect((await perform(house(), "identities", change("kit:sales", "yes"))).status).toBe("accepted");
    expect(allowedAct(house().tools.state().house, "carla", "payments", "receive")).toBe(false);
    expect(holderKit(house().tools.state().house, "carla").selections).toEqual([{ kind: "program", program: "sales" }]);
  });
});
it("two open editors merge action changes using today's kit and lose authority immediately on handover", async () => {
  await staged(kitProgram, async ({ house }) => {
    const router = houseRouter(localPorts(house(), "ana", { recentLines: 20 }), kitShown);
    const press = async (keys: string) => {
      keysOf(keys).forEach(key => router.send(key));
      await router.idle();
    };
    try {
      await press("i3h111");
      expect(router.screen({ rows: 40 }).body.kind).toBe("thread");
      await perform(house(), "identities", change("kit:sales:wait", "yes"));
      await press("s");
      expect(effectiveKit(house().tools.state().house, "carla", house().registry)).toEqual([
        { tool: "sales", acts: ["register", "wait"] },
      ]);
      await press("\x1b");
      await press("1");
      await perform(house(), "identities", { act: "hand", on: "identities/beto", input: {} });
      await press("n");
      expect(JSON.stringify(router.screen({ rows: 40 }))).toContain("only whoever administers");
      expect(allowedAct(house().tools.state().house, "carla", "sales", "register")).toBe(true);
    } finally {
      router.stop();
    }
  });
});
it("removing a subject during an open question cannot readmit it or restore its kit", async () => {
  await staged(kitProgram, async ({ house }) => {
    const router = houseRouter(localPorts(house(), "ana", { recentLines: 20 }), kitShown);
    const press = async (keys: string) => {
      keysOf(keys).forEach(key => router.send(key));
      await router.idle();
    };
    try {
      await press("i3h111");
      await perform(house(), "identities", { act: "remove", on: "identities/carla", input: {} });
      await press("s");
      expect(JSON.stringify(router.screen({ rows: 40 }))).toContain("removed");
      expect(house().tools.state().house.grants.has("carla")).toBe(false);
    } finally {
      router.stop();
    }
  });
});
it("mind kits survive reopening and grant only their own program and never identity administration", async () => {
  await staged(kitProgram, async ({ house, reopen }) => {
    const on = "identities/mind:sales";
    await perform(house(), "identities", change("kit:sales:register", "yes", on));
    reopen();
    expect(allowedAct(house().tools.state().house, "mind:sales", "sales", "register")).toBe(true);
    expect(allowedAct(house().tools.state().house, "mind:payments", "payments", "receive")).toBe(false);
    for (const act of ["kit:payments:receive", "remove", "readmit", "hand"])
      expect(
        (await perform(house(), "identities", { act, on, input: act.startsWith("kit:") ? { value: "yes" } : {} }))
          .reason,
      ).toEqual({ en: "only own actions", es: "solo acciones propias" });
    expect((await perform(house(), "identities", change("kit:sales", "yes", on))).status).toBe("accepted");
    expect(house().tools.state().house.grants.has("mind:sales")).toBe(false);
    await perform(house(), "identities", change("kit:sales:register", "no", on));
    reopen();
    expect(allowedAct(house().tools.state().house, "mind:sales", "sales", "register")).toBe(false);
  });
});
it.each([8, 9, 10])("law 2 boundary: %i tool actions plus the whole-tool row", async count => {
  await staged(kitBoundary(count), ({ house }) => {
    const core = houseTools(localPorts(house(), "ana", { recentLines: 20 }), boundaryShown, "es").find(
      tool => tool.id === "identities",
    );
    const rows = core?.view("identities/carla#tools").flatMap(stack => stack.rows);
    expect(rows?.[0]?.opens).toBe("identities/carla#kit:sales");
    expect(
      core
        ?.view("identities/carla#kit:sales/sales")
        .flatMap(stack => stack.rows)
        .filter(row => row.act),
    ).toHaveLength(count + 1);
    expect(house().registry.find(tool => tool.id === "identities")?.acts).toHaveProperty("kit:sales");
    return Promise.resolve();
  });
});
it("a one-tool composition derives its kit cases without inventing a foreign mind", async () => {
  const checks = programChecks(kitBoundary(1), boundaryShown);
  for (const check of checks.filter(check => check.name.includes("identities · kit:"))) await check.run();
}, 20000);

it("an identity can lose the whole tool after its last action was removed", async () => {
  await staged(kitProgram, async ({ house }) => {
    await perform(house(), "identities", change("kit:sales:register", "yes"));
    await perform(house(), "identities", change("kit:sales:register", "no"));
    expect(house().tools.state().house.grants.has("carla")).toBe(true);
    expect(holderKit(house().tools.state().house, "carla").selections).toEqual([]);
    expect((await perform(house(), "identities", change("kit:sales", "no"))).reason).toEqual({
      en: "no changes",
      es: "sin cambios",
    });
    expect(house().tools.state().house.grants.has("carla")).toBe(true);
  });
});
