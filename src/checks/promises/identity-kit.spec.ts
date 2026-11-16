import { expect, it } from "vitest";
import { perform, staged } from "./promised-stage.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { allowedAct } from "../../house/kit.ts";
import { kitProgram, kitShown } from "../../../tests/support/kit-program.ts";
const change = (act: string, value: string, on = "identities/carla") => ({ act, on, input: { value } });
it("only catalog tools and acts have declarations; no arbitrary kit-set is offered", async () => {
  await staged(kitProgram, async ({ house }) => {
    const core = house().registry.find(tool => tool.id === "identities");
    expect(core?.acts).toHaveProperty("kit:sales:register");
    const shown = houseTools(localPorts(house(), "ana", { recentLines: 20 }), kitShown).find(
      tool => tool.id === "identities",
    );
    expect(shown?.view("identities/carla#tools").flatMap(stack => stack.rows.map(row => row.title))).toEqual([
      "sales",
      "payments",
    ]);
    for (const act of ["kit-set", "kit:inventada:register", "kit:sales:inventada", "kit:identities:new"])
      expect(core?.acts).not.toHaveProperty(act);
    expect((await perform(house(), "identities", change("kit:sales:inventada", "yes"))).status).toBe("rejected");
  });
});
it("cuts one action, preserves other tools and cuts, grants whole tools, and survives reopening", async () => {
  await staged(kitProgram, async ({ house, reopen }) => {
    for (const [act, value] of [
      ["kit:sales:register", "yes"],
      ["kit:payments:receive", "yes"],
      ["kit:sales:wait", "yes"],
      ["kit:sales:register", "no"],
    ]) {
      expect((await perform(house(), "identities", change(act ?? "", value ?? ""))).status).toBe("accepted");
    }
    reopen();
    const state = house().tools.state().house;
    expect(allowedAct(state, "carla", "sales", "register")).toBe(false);
    expect(allowedAct(state, "carla", "sales", "wait")).toBe(true);
    expect(allowedAct(state, "carla", "payments", "receive")).toBe(true);
    expect((await perform(house(), "identities", change("kit:sales", "yes"))).status).toBe("accepted");
    expect(allowedAct(house().tools.state().house, "carla", "sales", "register")).toBe(true);
    await perform(house(), "identities", change("kit:sales", "no"));
    expect(house().tools.state().house.grants.get("carla")).toEqual(["payments"]);
    expect(house().tools.state().house.kits.get("carla")?.has("sales")).toBe(false);
    reopen();
    expect(allowedAct(house().tools.state().house, "carla", "sales", "wait")).toBe(false);
  });
});
it("rejects changes to the admin, removed identities and another tool's mind, without facts", async () => {
  await staged(kitProgram, async ({ house }) => {
    await perform(house(), "identities", { act: "remove", on: "identities/carla", input: {} });
    for (const on of ["identities/ana", "identities/carla", "identities/mind:payments"])
      expect((await perform(house(), "identities", change("kit:sales:register", "yes", on))).status).toBe("rejected");
    const core = houseTools(localPorts(house(), "ana", { recentLines: 20 }), kitShown).find(
      tool => tool.id === "identities",
    );
    expect(core?.actsOn?.["kit:sales:register"]?.off?.("identities/ana")).toBe("administra · todas");
    expect(house().tools.state().house.kits.has("ana")).toBe(false);
  });
});
