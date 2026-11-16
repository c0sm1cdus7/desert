// Missing empty reasons fail composition; enabling an empty first question fails a guarantee derived from cases.
import { Type, type TSchema } from "@sinclair/typebox";
import { afterEach, describe, expect, it } from "vitest";
import { object } from "../../../fields/visible-text.ts";
import { money, thing } from "../../../fields/fields.ts";
import { chargingShop, makingRegistry, narrowShop } from "../../../../tests/support/charging-shop.ts";
import { shopRig, testTime } from "../../../../tests/support/shop-rig.ts";
import { shopShown, type Shop } from "../../../../tests/support/shop.ts";
import { anyToolScreen } from "../../../surface/bridge/views/any-tool.ts";
import { houseTools } from "../../../surface/bridge/assembly/house-tools.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import type { Composition } from "../../../tools/promises.ts";
import { availabilityChecks } from "./promised-availability.ts";
import { type, view } from "../promised-keys.ts";
import { startRouter } from "../../../surface/router/router.ts";
const closing: { close?(): void; stop?(): void }[] = [];
afterEach(() => closing.splice(0).forEach(open => (open.stop ?? open.close)?.()));
const withField = (sale: TSchema): Composition<Shop> => ({
  ...chargingShop,
  registry: chargingShop.registry.map(tool =>
    tool.id !== "payments"
      ? tool
      : {
          ...tool,
          acts: Object.fromEntries(
            Object.entries(tool.acts).map(([name, act]) => [
              name,
              name === "charge" ? { ...act, input: object({ sale }) } : act,
            ]),
          ),
        },
  ),
});
const compose = (program = chargingShop, shown = shopShown) => {
  const rig = shopRig({ registry: program.registry });
  closing.push(rig);
  const tools = houseTools(
    rig.ports("ana", () => testTime.now()),
    shown,
  );
  const router = startRouter({
    defect: error => {
      throw error;
    },
    tools,
    bar: () => ({ state: "connected", clock: "00:00", now: 0 }),
  });
  closing.push(router);
  return { rig, tools, router };
};
const enabled: Shown<Shop> = {
  ...shopShown,
  screens: {
    payments: (ports, tool, words, acts, start) => {
      const plain = anyToolScreen(ports, tool, words, acts, start);
      return {
        ...plain,
        acts: Object.fromEntries(
          Object.entries(plain.acts).map(([name, act]) => [name, { ...act, off: () => undefined, listed: () => true }]),
        ),
      };
    },
  },
};
describe("a first choice needs somewhere to go", () => {
  for (const program of [chargingShop, narrowShop])
    for (const check of availabilityChecks(program, shopShown)) it(check.name, check.run);
  it("rejects compiling declarations without a maker or a usable reason, including nested fields", () => {
    const missing = thing("Venta", "sales");
    expect(() => compose(withField(missing))).toThrow("without a maker or an empty reason");
    expect(() => compose(withField(object({ nested: missing })))).toThrow("without a maker or an empty reason");
    for (const empty of ["", "   ", 7])
      expect(() => compose(withField({ ...missing, empty }))).toThrow("no usable empty reason");
    expect(() => compose(withField(thing("Venta", "sales", undefined, undefined, "sin ventas")))).not.toThrow();
  });
  it("fails derived cases when a compiling surface enables empty or entirely ineligible choices", async () => {
    const failed: string[] = [];
    for (const program of [chargingShop, narrowShop])
      for (const check of availabilityChecks(program, enabled))
        await check.run().catch((error: unknown) => {
          expect(error, check.name).toBeInstanceOf(Error);
          expect(error instanceof Error && error.message, check.name).toContain("An unavailable action is enabled");
          failed.push(check.name);
        });
    expect(failed).toHaveLength(2);
    expect(failed[0]).toContain("with no sales");
    expect(failed[1]).toContain("with only small sales");
  });
  it("allows an available maker with no existing things and no empty reason", () => {
    const program = withField(thing("Venta", "sales", undefined, "register"));
    const { tools, router } = compose(program);
    expect(tools.find(tool => tool.id === "payments")?.acts.charge?.off?.()).toBeUndefined();
    type(router, "pcr");
    expect(router.screen(view).title).toBe("Registrar");
  });
  it("keeps none distinct from empty: choosing no thing is an eligible answer", () => {
    const field = Type.Optional(thing("Venta", "sales", "sin venta", undefined, "sin ventas"));
    const { tools, router } = compose(withField(field));
    expect(tools.find(tool => tool.id === "payments")?.acts.charge?.off?.()).toBeUndefined();
    type(router, "pc");
    expect(router.screen(view).body).toMatchObject({ options: [{ title: "sin venta", selected: true }] });
  });
  it("closes the action if its maker is unavailable too", () => {
    const registry = makingRegistry.map(tool =>
      tool.id !== "sales"
        ? tool
        : {
            ...tool,
            acts: Object.fromEntries(
              Object.entries(tool.acts).map(([name, act]) => [
                name,
                { ...act, refuses: [...act.refuses, "sin permiso"], offered: () => "sin permiso" },
              ]),
            ),
          },
    );
    const { tools } = compose({ ...chargingShop, registry });
    expect(tools.find(tool => tool.id === "payments")?.acts.charge?.off?.()).toBe("sin ventas para cobrar");
  });
  it.each([undefined, "register"])("does not offer a maker that has no first answer, including a cycle: %s", makes => {
    const registry = makingRegistry.map(tool =>
      tool.id !== "sales"
        ? tool
        : {
            ...tool,
            acts: Object.fromEntries(
              Object.entries(tool.acts).map(([name, act]) => [
                name,
                {
                  ...act,
                  input: object({ sale: thing("Venta previa", "sales", undefined, makes, "sin ventas previas") }),
                },
              ]),
            ),
          },
    );
    const { tools } = compose({ ...chargingShop, registry });
    expect(tools.find(tool => tool.id === "payments")?.acts.charge?.off?.()).toBe("sin ventas para cobrar");
  });
});
describe("availability through each entry", () => {
  it("closes an action on a thing when the only candidate is the thing itself", () => {
    const field = thing("Otra venta", "sales", undefined, undefined, "sin otras ventas");
    const source = narrowShop.registry.find(tool => tool.id === "payments")?.acts.charge;
    if (!source) throw new Error("missing charge");
    const registry = narrowShop.registry.map(tool =>
      tool.id !== "sales"
        ? tool
        : {
            ...tool,
            acts: { ...tool.acts, link: { ...source, on: "thing" as const, key: "u", input: object({ sale: field }) } },
          },
    );
    const { rig, tools } = compose({ ...narrowShop, registry });
    rig.attend("ana", "sales");
    rig.act("ana", "register", { sale: "s1", total: 1500 }, "sales", rig.state().through);
    expect(tools.find(tool => tool.id === "sales")?.actsOn?.link?.off?.("sales/s1")).toBe("sin otras ventas");
  });
  it("checks the first remaining choice when another tool supplies earlier answers", () => {
    const registry = narrowShop.registry.map(tool =>
      tool.id !== "payments"
        ? tool
        : {
            ...tool,
            acts: Object.fromEntries(
              Object.entries(tool.acts).map(([name, act]) => [
                name,
                name !== "charge"
                  ? act
                  : {
                      ...act,
                      input: object({
                        amount: money("Monto"),
                        sale: thing("Venta", "sales", undefined, undefined, "sin ventas elegibles"),
                      }),
                      also: { tool: "sales", with: () => ({ amount: 1 }) },
                    },
              ]),
            ),
          },
    );
    const { rig, tools } = compose({ ...narrowShop, registry });
    rig.attend("ana", "sales");
    rig.act("ana", "register", { sale: "s2", total: 90 }, "sales", rig.state().through);
    expect(tools.find(tool => tool.id === "sales")?.alsoOn?.("sales/s2")).toContainEqual(
      expect.objectContaining({ title: "cobrar", off: true, detail: "sin ventas elegibles" }),
    );
  });
  it("reopens the menu action when an eligible thing appears", () => {
    const { rig, tools, router } = compose();
    const charge = tools.find(tool => tool.id === "payments")?.acts.charge;
    expect(charge?.off?.()).toBe("sin ventas para cobrar");
    rig.attend("ana", "sales");
    rig.act("ana", "register", { sale: "s1", total: 1500 }, "sales", rig.state().through);
    expect(charge?.off?.()).toBeUndefined();
    type(router, "pc");
    expect(router.screen(view).body).toMatchObject({ options: [{ title: "s1", selected: true }] });
  });
});
