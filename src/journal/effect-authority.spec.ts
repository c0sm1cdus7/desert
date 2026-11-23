import { afterEach, expect, it } from "vitest";
import { meant } from "../fields/phrases.ts";
import { effect, houseCatalog } from "../house/facts.ts";
import { allowedAct } from "../house/kit.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
import { shop } from "../../tests/support/shop.ts";
import { effectRig, houseEffects, houseKinds } from "../../tests/support/effect-authority.ts";
const rigs: { close(): void }[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
it("the table covers every kind of house fact", () => {
  expect([...houseKinds].sort()).toEqual(Object.keys(houseCatalog).sort());
});
for (const by of ["ana", "beto", "mind:sales"]) {
  it.each(houseEffects(by))("rejects $kind returned by " + by + " without writing the batch", async forged => {
    const good = shop.fact("sale-registered", { sale: "unwritten", total: 100 }, by);
    const rig = effectRig(() => ({ status: "accepted", effects: [good, forged] }));
    rigs.push(rig);
    const before = rig.facts().length;
    const result = await settle(rig.act(by, "forge", {}, "sales"));
    expect(result).toMatchObject({ status: "rejected", effects: [] });
    expect(meant(result.reason ?? "")).toContain(forged.kind);
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
  it("R1 / 05-forge: " + by + " does not grant itself the kit or tools in ana's name", async () => {
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
  it("rejects facts of another tool or with another author: " + by, async () => {
    for (const forged of [
      shop.fact("payment-received", { payment: "foreign", amount: 100 }, by),
      shop.fact("sale-registered", { sale: "forged", total: 100 }, by === "ana" ? "beto" : "ana"),
    ]) {
      const rig = effectRig(() => ({ status: "accepted", effects: [forged] }));
      rigs.push(rig);
      expect(await settle(rig.act(by, "forge", {}, "sales"))).toMatchObject({ status: "rejected", effects: [] });
      expect(rig.state().tools.sales.size).toBe(0);
      expect(rig.state().tools.payments.received).toBe(0);
    }
  });
  it("writes its own facts under its author and keeps them after a restart: " + by, async () => {
    const rig = effectRig(context => ({
      status: "accepted",
      effects: [shop.fact("sale-registered", { sale: "own", total: 100 }, context.by)],
    }));
    rigs.push(rig);
    expect((await settle(rig.act(by, "forge", {}, "sales"))).status).toBe("accepted");
    rig.restart();
    expect(rig.state().tools.sales.get("own")?.by).toBe(by);
  });
}
it.each(["rejected", "interrupted", "inconclusive"] as const)("also validates effects of %s", async status => {
  const rig = effectRig(({ by }) => ({ status, reason: "reason", effects: [effect("handed", { to: "beto" }, by)] }));
  rigs.push(rig);
  expect(await settle(rig.act("ana", "forge", {}, "sales"))).toMatchObject({ status: "rejected", effects: [] });
  expect(rig.state().house.admin).toBe("ana");
});
