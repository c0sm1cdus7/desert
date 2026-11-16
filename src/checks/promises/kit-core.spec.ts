import { expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { allowedAct } from "../../house/kit.ts";
import { cast, staged } from "./promised-stage.ts";
import { shopProgram } from "../../../tests/support/shop.ts";

it("gives the administrator every action only when the core is requested, including after reopening", async () => {
  for (const identities of [false, true])
    await staged({ ...shopProgram, identities }, ({ house, reopen }) => {
      house().bus.emit(effect("granted", { identity: cast.admin, tools: [] }, cast.admin));
      expect(allowedAct(house().tools.state().house, cast.admin, "sales", "register")).toBe(identities);
      reopen();
      expect(allowedAct(house().tools.state().house, cast.admin, "sales", "register")).toBe(identities);
      return Promise.resolve();
    });
});

it("stops reminders when the last action is removed", async () => {
  await staged(shopProgram, ({ house, reopen }) => {
    house().bus.emit(
      effect("tool-entry", { tool: "sales", target: "sales", author: cast.admin, text: "hola" }, cast.admin),
    );
    expect(house().tools.state().attentionBy.get(cast.member)?.has("sales")).toBe(true);
    house().bus.emit(effect("kit-set", { holder: cast.member, tool: "sales", acts: [] }, cast.admin));
    expect(house().tools.state().attentionBy.get(cast.member)?.has("sales")).toBe(false);
    reopen();
    expect(house().tools.state().attentionBy.get(cast.member)?.has("sales")).toBe(false);
    return Promise.resolve();
  });
});

it("shows only the removed action off, before its state reason, and distinguishes outsiders", async () => {
  const { actionOff } = await import("../../surface/bridge/acts/action-off.ts");
  const { toolTexts } = await import("../../texts/tools.texts.ts");
  await staged(shopProgram, ({ house }) => {
    const tool = shopProgram.registry.find(item => item.id === "sales");
    if (!tool) throw new Error("Missing sales");
    const entry = Object.entries(tool.acts)[0];
    if (!entry) throw new Error("Missing action");
    const [name, act] = entry;
    house().bus.emit(effect("kit-set", { holder: cast.member, tool: tool.id, acts: [] }, cast.admin));
    const state = { ...house().tools.state(), by: cast.member };
    expect(actionOff(act, state, tool.id, tool.id, 0, () => null, undefined, name)).toBe(toolTexts.outsideKit);
    expect(actionOff(act, { ...state, by: "missing" }, tool.id, tool.id, 0, () => null, undefined, name)).toBe(
      toolTexts.unassigned,
    );
    return Promise.resolve();
  });
});

it("calls the administrator for both tools when the core is requested", async () => {
  await staged({ ...shopProgram, identities: true }, ({ house, reopen }) => {
    house().bus.emit(effect("granted", { identity: cast.admin, tools: [] }, cast.admin));
    for (const tool of ["sales", "payments"]) {
      house().bus.emit(effect("tool-entry", { tool, target: tool, author: cast.member, text: "hola" }, cast.member));
    }
    expect([...(house().tools.state().attentionBy.get(cast.admin)?.keys() ?? [])].sort()).toEqual([
      "payments",
      "sales",
    ]);
    reopen();
    expect(house().tools.state().attentionBy.get(cast.admin)?.size).toBe(2);
    return Promise.resolve();
  });
});

it("shows Attention only while an assigned member has an action", async () => {
  const { seated } = await import("./promised-keys.ts");
  const { shopShown } = await import("../../../tests/support/shop.ts");
  const registry = shopProgram.registry.map(tool =>
    tool.id === "sales" ? { ...tool, needs: () => [{ target: "sales", why: "pendiente" }] } : tool,
  );
  await staged({ ...shopProgram, registry }, ({ house }) => {
    const seat = seated(house(), cast.member, shopShown);
    const needs = () => seat.tools.find(tool => tool.id === "sales")?.notices?.().needs;
    try {
      expect(needs()).toHaveLength(1);
      house().bus.emit(effect("kit-set", { holder: cast.member, tool: "sales", acts: [] }, cast.admin));
      expect(needs()).toHaveLength(0);
      house().bus.emit(effect("kit-set", { holder: cast.member, tool: "sales", acts: ["register"] }, cast.admin));
      expect(needs()).toHaveLength(1);
    } finally {
      seat.router.stop();
    }
    return Promise.resolve();
  });
});
