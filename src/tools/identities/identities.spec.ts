import { present } from "../../house/kit.ts";
import { expect, it } from "vitest";
import { staged, perform } from "../../checks/promises/promised-stage.ts";
import { shopProgram, shopShown } from "../../../tests/support/shop.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { effect } from "../../house/facts.ts";
import { identityNameTexts } from "../../texts/tools.texts.ts";

const program = { ...shopProgram, identities: true };
const create = { act: "new", input: { identity: "luz", name: "Luz", tools: ["sales"], language: "es" } };
const on = "identities/luz";
it("the composition opts in, without a slice or process, while the original shop stays unchanged", async () => {
  for (const enabled of [false, true])
    await staged({ ...shopProgram, identities: enabled }, ({ house }) => {
      const core = house().registry.find(tool => tool.id === "identities");
      expect(Boolean(core)).toBe(enabled);
      expect(core ?? {}).not.toHaveProperty("start");
      expect(Object.keys(house().tools.state().tools)).toEqual(["sales", "payments"]);
      const tools = houseTools(localPorts(house(), "ana", { recentLines: 20 }), shopShown);
      expect(tools.some(tool => tool.id === "identities")).toBe(enabled);

      return Promise.resolve();
    });
});
it("creates the name and whole tools, keeps the removed row, readmits empty and persists", async () => {
  await staged(program, async ({ house, reopen }) => {
    expect((await perform(house(), "identities", create)).status).toBe("accepted");
    expect(house().tools.state().house.names.get("luz")).toBe("Luz");
    expect(house().tools.state().house.grants.get("luz")).toEqual(["sales"]);
    house().bus.emit(effect("kit-set", { holder: "luz", tool: "sales", acts: [] }, "ana"));
    expect((await perform(house(), "identities", { act: "remove", on, input: {} })).status).toBe("accepted");
    reopen();
    const tool = house().registry.find(tool => tool.id === "identities");
    expect(tool?.view(house().tools.state(), "identities", { recentLines: 20, now: 0 })).toContain("sacada");
    expect((await perform(house(), "identities", { act: "readmit", on, input: {} })).status).toBe("accepted");
    reopen();
    expect(house().tools.state().house.grants.get("luz")).toEqual([]);
    expect(house().tools.state().house.kits.has("luz")).toBe(false);
    expect(house().tools.state().house.names.get("luz")).toBe("Luz");
  });
});
it("every member reads every identity and kit but only the administrator can act", async () => {
  await staged(program, async ({ house }) => {
    await perform(house(), "identities", create);
    const tools = houseTools(localPorts(house(), "carla", { recentLines: 20 }), shopShown);
    const core = tools.find(tool => tool.id === "identities");
    expect(core?.place).toEqual({ key: "i", section: "system" });
    expect(
      core
        ?.view()
        .flatMap(stack => stack.rows)
        .some(row => row.title === "Luz"),
    ).toBe(true);
    expect(core?.view(on).some(stack => stack.title === "Kit" && stack.rows.length > 0)).toBe(true);
    expect(core?.acts.new?.off?.()).toBe("solo quien administra");
    for (const act of ["remove", "readmit", "hand"])
      expect(core?.actsOn?.[act]?.off?.(on)).toBe("solo quien administra");
    for (const by of ["beto", "carla"])
      for (const act of ["new", "remove", "readmit", "hand"])
        expect(
          await perform(house(), "identities", {
            by,
            act,
            on: act === "new" ? "identities" : on,
            input: act === "new" ? create.input : {},
          }),
        ).toMatchObject({ status: "rejected", reason: "solo quien administra" });
  });
});
it("rejects invalid identifiers and keeps their rule out of the empty question", async () => {
  await staged(program, async ({ house }) => {
    const core = houseTools(localPorts(house(), "ana", { recentLines: 20 }), shopShown).find(
      tool => tool.id === "identities",
    );
    expect(JSON.stringify(core?.acts.new?.next([]))).toContain("Identificador");
    expect(JSON.stringify(core?.acts.new?.next([]))).not.toContain(identityNameTexts.rule);
    expect(core?.acts.new?.next([])).toMatchObject({ placeholder: "lucia" });
    for (const identity of ["Ana", "mind:identities", "house", " a", "a".repeat(65), "a:b", "a\u200b"])
      expect(await perform(house(), "identities", { ...create, input: { ...create.input, identity } })).toMatchObject({
        status: "rejected",
        reason: identityNameTexts.rule,
      });
    expect(house().tools.state().house.grants.has("luz")).toBe(false);
  });
});
it("Identities cannot be granted or taken, has no mind and is never in all tools", async () => {
  await staged(program, async ({ house }) => {
    expect(() => house().bus.emit(effect("granted", { identity: "beto", tools: ["identities"] }, "ana"))).toThrow(
      "Identidades",
    );
    expect(() => house().bus.emit(effect("kit-set", { holder: "beto", tool: "identities", acts: [] }, "ana"))).toThrow(
      "Identidades",
    );
    expect(present(house().registry, house().tools.state().house, "mind:identities")).toBe(false);
    expect(house().tools.act({ act: "scene", input: { general: "Escena" } }, 0, "mind:identities")).toMatchObject({
      status: "rejected",
      reason: "sin acceso",
    });
    expect((await perform(house(), "identities", { ...create, by: "mind:identities" })).status).toBe("rejected");
    const core = houseTools(localPorts(house(), "ana", { recentLines: 20 }), shopShown).find(
      tool => tool.id === "identities",
    );
    expect(core?.acts.new?.next(["luz", ""])).toMatchObject({
      kind: "many",
      options: [{ title: "sales" }, { title: "payments" }],
    });
    expect(house().tools.state().house.grants.get("ana")).not.toContain("identities");
  });
});
it("hands administration over, immediately revokes the previous admin and survives reopening", async () => {
  await staged(program, async ({ house, reopen }) => {
    expect(await perform(house(), "identities", { act: "hand", on: "identities/beto", input: {} })).toMatchObject({
      status: "accepted",
    });
    expect((await perform(house(), "identities", create)).reason).toBe("solo quien administra");
    reopen();
    expect(house().tools.state().house.admin).toBe("beto");
    expect((await perform(house(), "identities", { ...create, by: "beto" })).status).toBe("accepted");
  });
});
