// Los pagos nuevos no multiplican los rechazos pendientes ni los avisos de atención.
import { afterEach, expect, it, vi } from "vitest";
import { effect } from "../house/facts.ts";
import { shop } from "../../tests/support/shop.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";

const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));

it("cada aviso sin kit se intenta una vez; otro aviso no reintenta los rechazados", async () => {
  const rig = shopRig();
  rigs.push(rig);
  const attempts = () => rig.facts().filter(event => event.kind === "act" && event.data.reaction);
  const pendingEntries = () => rig.state().entries.filter(entry => entry.data.text.includes("Reacción pendiente"));
  for (let index = 1; index <= 12; index++) {
    rig.bus.emit(shop.fact("payment-received", { payment: `p${index}`, amount: 1 }, "ana"));
    await vi.waitFor(() => expect(pendingEntries()).toHaveLength(index));
    expect(attempts()).toHaveLength(index);
  }
  expect(rig.tools().pendingReactions()).toHaveLength(12);
  expect(
    rig
      .tools()
      .pendingReactions()
      .every(each => each.reason === "fuera del kit"),
  ).toBe(true);
  rig.bus.emit(effect("kit-set", { holder: "mind:payments", tool: "payments", acts: ["notice"] }, "ana"));
  await vi.waitFor(() => expect(rig.tools().pendingReactions()).toEqual([]));
  expect(attempts()).toHaveLength(24);
  expect(rig.state().entries.filter(entry => entry.data.text.startsWith("Avisado"))).toHaveLength(12);
  rig.restart();
  await rig.tools().recoverReactions();
  expect(attempts()).toHaveLength(24);
});

it("la recuperación explícita reintenta lo pendiente sin esperar otro aviso", async () => {
  const rig = shopRig();
  rigs.push(rig);
  rig.bus.emit(shop.fact("payment-received", { payment: "p1", amount: 1 }, "ana"));
  await rig.tools().recoverReactions();
  await rig.tools().recoverReactions();
  expect(rig.facts().filter(event => event.kind === "act" && event.data.reaction)).toHaveLength(2);
  expect(rig.tools().pendingReactions()).toMatchObject([{ reason: "fuera del kit" }]);
});
