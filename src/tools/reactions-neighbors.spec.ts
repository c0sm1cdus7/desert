// The delivery and execution edges keep pending work without duplicating effects.
import { afterEach, expect, it, vi } from "vitest";
import { effect } from "../house/facts.ts";
import { programAct } from "./promises.ts";
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
    effects: [shop.fact("sale-registered", { sale: input.payment, total: input.amount }, by)],
  }),
);
const open = (action: ToolAct<Shop> = mark, process: (id: string) => boolean = () => false) => {
  const rig = shopRig({
    process,
    registry: [
      { ...salesTool, acts: { mark: action }, reactions: { paid: { when: "payment-received", act: "mark" } } },
      { ...paymentsTool, reactions: {} },
    ],
  });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:sales", tool: "sales", acts: ["mark"] }, "ana"));
  return rig;
};
const notice = (rig: ReturnType<typeof open>, payment = "p1") =>
  rig.bus.emit(shop.fact("payment-received", { payment, amount: 10 }, "ana"));
const marks = (rig: ReturnType<typeof open>) => rig.facts().filter(e => e.kind === "sale-registered");
it("redelivering the same notice before and after confirming does not duplicate the act", async () => {
  const rig = open();
  const source = notice(rig);
  const append = rig.journal.append.bind(rig.journal);
  const delivery = vi
    .spyOn(rig.journal, "append")
    .mockImplementation((emission, at) => (emission.kind === "payment-received" ? source : append(emission, at)));
  notice(rig);
  await rig.tools().recoverReactions();
  notice(rig);
  await rig.tools().recoverReactions();
  delivery.mockRestore();
  rig.restart();
  await rig.tools().recoverReactions();
  expect(marks(rig)).toHaveLength(1);
  expect(rig.facts().filter(e => e.kind === "act" && e.data.reaction)).toHaveLength(1);
});
it("a notice arriving during another reaction is processed without waiting for a restart", async () => {
  let release = () => {};
  let first = true;
  const rig = open({
    ...mark,
    run: async (input, context) => {
      if (first) {
        first = false;
        await new Promise<void>(resolve => {
          release = resolve;
        });
      }
      return mark.run(input, context);
    },
  });
  notice(rig);
  await vi.waitFor(() => expect(rig.state().processing.size).toBe(1));
  notice(rig, "p2");
  // Give the scheduler a turn while the first action still owns the worker.
  await new Promise<void>(resolve => setTimeout(resolve, 10));
  release();
  await vi.waitFor(() => expect(marks(rig)).toHaveLength(2));
  expect(rig.tools().pendingReactions()).toEqual([]);
});
it("a refusal confirms no partial effects; its reason is in the activity", async () => {
  const rig = open({
    ...mark,
    run: (_, { by }) => ({
      status: "rejected",
      reason: "venta incompatible",
      effects: [shop.fact("sale-registered", { sale: "partial", total: 1 }, by)],
    }),
  });
  notice(rig);
  await rig.tools().recoverReactions();
  expect(marks(rig)).toEqual([]);
  expect(
    rig
      .state()
      .entries.some(e => e.data.text.includes("Reacción pendiente") && e.data.text.includes("venta incompatible")),
  ).toBe(true);
  rig.restart();
  expect(rig.tools().pendingReactions()[0]?.reason).toBe("venta incompatible");
});
it("a reaction defect does not refuse the notice and keeps the diagnostic and the pending one", async () => {
  const rig = open(
    programAct<Shop, (typeof shopCatalog)["payment-received"]>({
      input: shopCatalog["payment-received"],
      name: "marcar",
      enter: "marcar",
      purpose: "marcar el pago",
      key: "m",
      on: "tool",
      undoable: true,
      cases: [
        {
          promise: "el defecto queda diagnosticado",
          input: { payment: "p1", amount: 10 },
          then: { says: "Marcado", facts: [] },
        },
      ],
      run: () => {
        throw new Error("falló la marca");
      },
    }),
  );
  expect(() => notice(rig)).not.toThrow();
  await rig.tools().recoverReactions();
  expect(marks(rig)).toEqual([]);
  expect(rig.tools().pendingReactions()[0]?.reason).toContain("E-PROG-1");
  expect(rig.state().entries.some(e => e.data.diagnostic?.includes("falló la marca"))).toBe(true);
  rig.restart();
  expect(rig.tools().pendingReactions()[0]?.reason).toContain("E-PROG-1");
});
it("the reaction cannot get writes ahead with a nested execution", async () => {
  let nested = false;
  const rig = open({
    ...mark,
    run: (input, context) => {
      nested = context.execute !== undefined;
      return mark.run(input, context);
    },
  });
  notice(rig);
  await rig.tools().recoverReactions();
  expect(nested).toBe(false);
  expect(marks(rig)).toHaveLength(1);
});
it("a listener failure while confirming reverts mark and receipt, and allows recovery", async () => {
  const rig = open();
  notice(rig);
  const stop = rig.bus.on(event => {
    if (event.kind === "act-result" && event.data.status === "accepted") throw new Error("oyente al confirmar");
  });
  await rig.tools().recoverReactions();
  stop();
  expect(marks(rig)).toEqual([]);
  rig.restart();
  await rig.tools().recoverReactions();
  expect(marks(rig)).toHaveLength(1);
});
it("a declaration can choose neither a foreign action nor a way out to the world", () => {
  for (const action of ["receive", "world"]) {
    expect(() =>
      shopRig({
        registry: [
          {
            ...salesTool,
            acts: { world: { ...mark, reach: "world" } },
            reactions: { paid: { when: "payment-received", act: action } },
          },
          paymentsTool,
        ],
      }),
    ).toThrow("Reacción inválida");
  }
});

it("the new reaction act does not inherit the process of whoever produced the notice", async () => {
  const rig = open(mark, () => true);
  notice(rig);
  await rig.tools().recoverReactions();
  expect(marks(rig)).toHaveLength(1);
  expect(marks(rig)[0]?.process).toBeUndefined();
  const act = rig.facts().find(event => event.kind === "act" && event.data.reaction);
  expect(act?.process).toBeUndefined();
});
