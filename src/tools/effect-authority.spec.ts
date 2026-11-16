import { afterEach, expect, it } from "vitest";
import { effect, houseCatalog } from "../journal/events.ts";
import { allowedAct } from "../house/house.ts";
import { settle } from "../surface/bridge/house-ports.ts";
import { shop } from "../../tests/support/shop.ts";
import { effectRig, houseEffects, houseKinds } from "../../tests/support/effect-authority.ts";
const rigs: { close(): void }[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
it("la tabla cubre cada tipo de hecho de la casa", () => {
  expect([...houseKinds].sort()).toEqual(Object.keys(houseCatalog).sort());
});
for (const by of ["ana", "beto", "mind:sales"]) {
  it.each(houseEffects(by))("rechaza $kind devuelto por " + by + " sin escribir el lote", async forged => {
    const good = shop.fact("sale-registered", { sale: "no escrita", total: 100 }, by);
    const rig = effectRig(() => ({ status: "accepted", effects: [good, forged] }));
    rigs.push(rig);
    const before = rig.facts().length;
    const result = await settle(rig.act(by, "forge", {}, "sales"));
    expect(result).toMatchObject({ status: "rejected", effects: [] });
    expect(result.reason).toContain(forged.kind);
    expect(rig.state().tools.sales.size).toBe(0);
    expect(
      rig
        .facts()
        .slice(before)
        .some(e => e.kind === forged.kind),
    ).toBe(forged.kind === "act" || forged.kind === "act-result" || forged.kind === "act-started");
    expect(
      rig
        .facts()
        .slice(before)
        .every(e => e.by === by),
    ).toBe(true);
  });
  it("R1 / 05-forja: " + by + " no se da el kit ni herramientas a nombre de ana", async () => {
    const rig = effectRig(() => ({
      status: "accepted",
      effects: [
        effect("kit-set", { holder: by, tool: "sales", acts: null }, "ana"),
        effect("granted", { identity: by, tools: ["sales", "payments"] }, "ana"),
      ],
    }));
    rigs.push(rig);
    const before = rig.state().house;
    const result = await settle(rig.act(by, "forge", {}, "sales"));
    expect(result.status).toBe("rejected");
    expect(rig.state().house).toEqual(before);
    if (by !== "ana") expect(allowedAct(rig.state().house, by, "sales", "other")).toBe(false);
  });
  it("rechaza hechos de otra herramienta o con otro autor: " + by, async () => {
    for (const forged of [
      shop.fact("payment-received", { payment: "ajeno", amount: 100 }, by),
      shop.fact("sale-registered", { sale: "forjada", total: 100 }, by === "ana" ? "beto" : "ana"),
    ]) {
      const rig = effectRig(() => ({ status: "accepted", effects: [forged] }));
      rigs.push(rig);
      expect(await settle(rig.act(by, "forge", {}, "sales"))).toMatchObject({ status: "rejected", effects: [] });
      expect(rig.state().tools.sales.size).toBe(0);
      expect(rig.state().tools.payments.received).toBe(0);
    }
  });
  it("escribe lo propio con su autor y lo conserva al reiniciar: " + by, async () => {
    const rig = effectRig(context => ({
      status: "accepted",
      effects: [shop.fact("sale-registered", { sale: "propia", total: 100 }, context.by)],
    }));
    rigs.push(rig);
    expect((await settle(rig.act(by, "forge", {}, "sales"))).status).toBe("accepted");
    rig.restart();
    expect(rig.state().tools.sales.get("propia")?.by).toBe(by);
  });
}
it.each(["rejected", "interrupted", "inconclusive"] as const)("también valida efectos de %s", async status => {
  const rig = effectRig(({ by }) => ({ status, reason: "motivo", effects: [effect("handed", { to: "beto" }, by)] }));
  rigs.push(rig);
  expect(await settle(rig.act("ana", "forge", {}, "sales"))).toMatchObject({ status: "rejected", effects: [] });
  expect(rig.state().house.admin).toBe("ana");
});
