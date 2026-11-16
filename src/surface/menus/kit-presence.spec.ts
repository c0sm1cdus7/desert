import { expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { houseTools } from "../bridge/assembly/house-tools.ts";
import { houseRouter } from "../bridge/assembly/house-router.ts";
import { findable, foundAt } from "./finding.ts";
import { stacksOf } from "./lists.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopShown } from "../../../tests/support/shop.ts";
import { settlingShop } from "../../../tests/support/settling-shop.ts";

it("withdraws every reading immediately and writes no acts for an absent person", async () => {
  const rig = shopRig({ grants: { ana: ["sales", "payments"], dora: ["sales"] } });
  const router = houseRouter(
    rig.ports("dora", () => 5000),
    shopShown,
  );
  try {
    rig.attend("ana", "sales");
    rig.act("ana", "register", { sale: "s1", total: 1500 }, "sales");
    router.send({ kind: "type", text: "v" });
    router.screen({ rows: 30 });
    rig.bus.emit(effect("removed", { identity: "dora" }, "ana"));
    const before = rig.facts().length;
    const screen = router.screen({ rows: 30 });
    expect(screen.title).toBe("Menú");
    expect(JSON.stringify(screen)).not.toContain("s1");
    expect(JSON.stringify(screen)).toContain("sin acceso");
    for (const by of ["dora", "zeta"]) {
      const tools = houseTools(
        rig.ports(by, () => 5000),
        shopShown,
      );
      const menu = stacksOf({ kind: "menu", at: 0 }, tools);
      expect(menu.flatMap(s => s.rows).filter(r => r.detail === "sin acceso")).toHaveLength(2);
      expect(menu.find(s => s.title === "Herramientas")?.rows.some(r => r.open)).toBe(false);
      const sales = tools.find(t => t.id === "sales");
      expect(sales?.notices?.().news).toEqual([]);
      expect(findable({ kind: "menu", at: 0 }, tools)).toBe(false);
      expect(
        foundAt({ kind: "menu", at: 0 }, "s1", tools)
          .flatMap(stack => stack.rows)
          .some(row => row.open),
      ).toBe(false);
      sales?.rendered?.("sales/s1");
    }
    await router.idle();
    expect(
      rig
        .facts()
        .slice(before)
        .filter(f => f.by === "dora" || f.by === "zeta"),
    ).toEqual([]);
    expect(rig.state().attentionBy.get("dora")?.has("sales")).toBe(false);
  } finally {
    router.stop();
    rig.close();
  }
});

it("ignores obsolete action names for attention and reminders, including after restart", () => {
  const rig = shopRig({ registry: settlingShop.registry, grants: { ana: ["sales"], beto: ["sales"] } });
  try {
    rig.bus.emit(effect("tool-entry", { tool: "sales", target: "sales", author: "ana", text: "hola" }, "ana"));
    expect(rig.state().attentionBy.get("beto")?.has("sales")).toBe(true);
    rig.bus.emit(effect("kit-set", { holder: "beto", tool: "sales", acts: ["fantasma"] }, "ana"));
    expect(rig.state().attentionBy.get("beto")?.has("sales")).toBe(false);
    rig.bus.emit(effect("tool-entry", { tool: "sales", target: "sales", author: "ana", text: "otra" }, "ana"));
    expect(rig.state().attentionBy.get("beto")?.has("sales")).toBe(false);
    rig.restart();
    expect(rig.state().attentionBy.get("beto")?.has("sales")).toBe(false);
  } finally {
    rig.close();
  }
});

it("clears activity when a member with no actions opens it and redistributes directed needs", () => {
  const registry = settlingShop.registry.map(tool =>
    tool.id === "sales" ? { ...tool, needs: () => [{ target: "sales", why: "pendiente", to: "beto" }] } : tool,
  );
  const rig = shopRig({ registry, grants: { ana: ["sales"], beto: ["sales"], carla: ["sales"] } });
  try {
    rig.bus.emit(effect("kit-set", { holder: "beto", tool: "sales", acts: [] }, "ana"));
    rig.bus.emit(effect("tool-entry", { tool: "sales", target: "sales", author: "ana", text: "noticia" }, "ana"));
    const beto = houseTools(
      rig.ports("beto", () => 5000),
      shopShown,
    ).find(t => t.id === "sales");
    const carla = houseTools(
      rig.ports("carla", () => 5000),
      shopShown,
    ).find(t => t.id === "sales");
    expect(beto?.notices?.().news).toHaveLength(1);
    expect(beto?.notices?.().needs).toHaveLength(0);
    expect(carla?.notices?.().needs).toHaveLength(1);
    beto?.rendered?.("sales");
    expect(beto?.notices?.().news).toHaveLength(0);
    expect(rig.state().attentionBy.get("beto")?.has("sales")).not.toBe(true);
  } finally {
    rig.close();
  }
});

it("lets the administrator use adapters for unassigned tools when identities are enabled", async () => {
  const { allowed, holds } = await import("../../house/kit.ts");
  const { cast, staged } = await import("../../checks/promises/promised-stage.ts");
  const { shopProgram } = await import("../../../tests/support/shop.ts");
  await staged({ ...shopProgram, identities: true }, ({ house }) => {
    house().bus.emit(effect("granted", { identity: cast.admin, tools: [] }, cast.admin));
    const state = house().tools.state().house;
    expect(allowed(state, cast.admin, "sales")).toBe(true);
    expect(holds(shopProgram.registry, state, cast.admin, "sales")).toBe(true);
    return Promise.resolve();
  });
});

it("removes a live reminder when a person leaves and keeps it off after reopening", () => {
  const rig = shopRig({ grants: { ana: ["sales"], dora: ["sales"] } });
  try {
    rig.bus.emit(effect("tool-entry", { tool: "sales", target: "sales", author: "ana", text: "hola" }, "ana"));
    expect(rig.state().attentionBy.get("dora")?.has("sales")).toBe(true);
    rig.bus.emit(effect("removed", { identity: "dora" }, "ana"));
    expect(rig.state().attentionBy.get("dora")?.has("sales")).toBe(false);
    rig.restart();
    expect(rig.state().attentionBy.get("dora")?.has("sales")).toBe(false);
  } finally {
    rig.close();
  }
});

it("does not attend a stale reminder while rendering after removal", () => {
  const rig = shopRig({ grants: { ana: ["sales"], dora: ["sales"] } });
  try {
    rig.bus.emit(effect("removed", { identity: "dora" }, "ana"));
    const ports = rig.ports("dora", () => 5000);
    const stale = {
      ...ports,
      state: () => ({ ...ports.state(), attention: new Map([["sales", { delay: 1, wake: "old" }]]) }),
    };
    const before = rig.facts().length;
    houseTools(stale, shopShown)
      .find(tool => tool.id === "sales")
      ?.rendered?.("sales");
    expect(
      rig
        .facts()
        .slice(before)
        .filter(fact => fact.by === "dora"),
    ).toEqual([]);
  } finally {
    rig.close();
  }
});
