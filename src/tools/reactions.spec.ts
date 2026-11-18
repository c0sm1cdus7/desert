// Las reacciones conservan autoría propia, permiso vigente y una sola confirmación por aviso.
import { afterEach, expect, it, vi } from "vitest";
import { effect } from "../house/facts.ts";
import { toolAct } from "./act-definition.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shop, shopCatalog, salesTool, paymentsTool, type Shop } from "../../tests/support/shop.ts";
import type { ToolAct } from "./tool-contract.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => {
  rigs.splice(0).forEach(rig => rig.close());
  vi.restoreAllMocks();
});
const mark = toolAct<Shop, (typeof shopCatalog)["payment-received"]>(
  shopCatalog["payment-received"],
  (input, { by }) => ({
    status: "accepted",
    effects: [shop.fact("sale-corrected", { sale: input.sale ?? input.payment, total: input.amount, paid: 0 }, by)],
  }),
);
const open = (action: ToolAct<Shop> = mark) => {
  const rig = shopRig({
    registry: [
      {
        ...salesTool,
        acts: { ...salesTool.acts, mark: action },
        reactions: { paid: { when: "payment-received", act: "mark" } },
      },
      { ...paymentsTool, reactions: {} },
    ],
  });
  rigs.push(rig);
  return rig;
};
const kit = (rig: ReturnType<typeof open>, acts: string[]) =>
  rig.bus.emit(effect("kit-set", { holder: "mind:sales", tool: "sales", acts }, rig.state().house.admin));
const notice = (rig: ReturnType<typeof open>, by = "ana", payment = "p1") =>
  rig.bus.emit(shop.fact("payment-received", { payment, amount: 10, sale: "s1" }, by));
const marks = (rig: ReturnType<typeof open>) => rig.facts().filter(e => e.kind === "sale-corrected");
it("H3: revocar a Ana no presta ni quita el permiso de la mente; causa y autor los fija el core", async () => {
  const rig = open();
  kit(rig, ["mark"]);
  rig.attend("ana", "payments");
  expect(rig.act("ana", "receive", { payment: "p1", amount: 10, sale: "s1" }, "payments").status).toBe("accepted");
  const source = rig.facts().find(event => event.kind === "payment-received");
  if (!source) throw new Error("Falta el aviso de Ana");
  expect(source.by).toBe("ana");
  rig.bus.emit(effect("handed", { to: "beto" }, "ana"));
  rig.bus.emit(effect("granted", { identity: "ana", tools: [] }, "beto"));
  await rig.tools().recoverReactions();
  expect(marks(rig)).toHaveLength(1);
  expect(marks(rig)[0]).toMatchObject({ by: "mind:sales", cause: [source.id] });
  const act = rig.facts().find(e => e.kind === "act" && e.data.option === "mark");
  expect(act).toMatchObject({ by: "mind:sales", cause: [source.id] });
  expect(rig.tools().pendingReactions()).toEqual([]);
});
it("H3: revocar la mente deja motivo visible y pendiente recuperable al reabrir", async () => {
  const rig = open();
  kit(rig, ["mark"]);
  const source = notice(rig);
  kit(rig, []);
  await rig.tools().recoverReactions();
  expect(marks(rig)).toEqual([]);
  expect(rig.tools().pendingReactions()).toMatchObject([
    { notice: source.id, by: "mind:sales", reason: "fuera del kit" },
  ]);
  rig.restart();
  await rig.tools().recoverReactions();
  expect(marks(rig)).toEqual([]);
  kit(rig, ["mark"]);
  await rig.tools().recoverReactions();
  expect(marks(rig)).toHaveLength(1);
});
it("H3: reentrega, recuperación concurrente y reapertura dejan a lo sumo una marca", async () => {
  const rig = open();
  kit(rig, ["mark"]);
  notice(rig);
  await Promise.all([rig.tools().recoverReactions(), rig.tools().recoverReactions()]);
  rig.boot();
  await rig.tools().recoverReactions();
  rig.restart();
  await rig.tools().recoverReactions();
  expect(marks(rig)).toHaveLength(1);
});
it("recupera el aviso confirmado aunque se cierre antes de ejecutar la reacción", async () => {
  const rig = open();
  kit(rig, ["mark"]);
  notice(rig);
  rig.restart();
  await rig.tools().recoverReactions();
  expect(marks(rig)).toHaveLength(1);
});
it("un aviso de otra mente sin kit no concede permiso a quien reacciona", async () => {
  const rig = open();
  notice(rig, "mind:payments");
  await rig.tools().recoverReactions();
  rig.restart();
  await rig.tools().recoverReactions();
  expect(marks(rig)).toEqual([]);
  kit(rig, ["mark"]);
  await rig.tools().recoverReactions();
  expect(marks(rig)).toHaveLength(1);
  expect(marks(rig)[0]?.by).toBe("mind:sales");
});
it("marca y finalización se revierten juntas si falla la última escritura", async () => {
  const rig = open();
  kit(rig, ["mark"]);
  notice(rig);
  const append = rig.journal.append.bind(rig.journal);
  const fault = vi.spyOn(rig.journal, "append").mockImplementation((emission, at) => {
    if (emission.kind === "act-result" && emission.data.status === "accepted") throw new Error("corte al confirmar");
    return append(emission, at);
  });
  await rig.tools().recoverReactions();
  expect(marks(rig)).toEqual([]);
  fault.mockRestore();
  rig.restart();
  await rig.tools().recoverReactions();
  expect(marks(rig)).toHaveLength(1);
});
it("un aviso revertido no ejecuta escrituras diferidas", async () => {
  const rig = open();
  kit(rig, ["mark"]);
  expect(() =>
    rig.bus.together(() => {
      notice(rig);
      throw new Error("revertir");
    }),
  ).toThrow("revertir");
  await rig.tools().recoverReactions();
  rig.restart();
  await rig.tools().recoverReactions();
  expect(marks(rig)).toEqual([]);
});
it("una revocación durante la espera corta la reacción y conserva el pendiente", async () => {
  let release = () => {};
  const action: ToolAct<Shop> = {
    ...mark,
    run: async (input, context) => {
      await new Promise<void>(resolve => {
        release = resolve;
      });
      return mark.run(input, context);
    },
  };
  const rig = open(action);
  kit(rig, ["mark"]);
  notice(rig);
  const recovery = rig.tools().recoverReactions();
  await vi.waitFor(() => expect(rig.state().processing.size).toBe(1));
  kit(rig, []);
  release();
  await recovery;
  expect(marks(rig)).toEqual([]);
  expect(rig.tools().pendingReactions()[0]?.reason).toBe("sacada");
});
