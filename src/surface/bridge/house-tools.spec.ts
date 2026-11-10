// A house's tools on a surface: everything shown comes from the house, in the product's words, through its acts.
import { Type } from "@sinclair/typebox";
import { afterEach, describe, expect, it } from "vitest";
import { identityView } from "../../house/house.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Tool as HouseTool } from "../../tools/tool-contract.ts";
import { must } from "../window.ts";
import type { HousePorts, SurfaceWords } from "./house-ports.ts";
import { houseTools } from "./house-tools.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, shopWords, type Shop } from "../../../tests/support/shop.ts";

const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = (options: Parameters<typeof shopRig>[0] = {}) => {
  const rig = shopRig(options);
  rigs.push(rig);
  const ports = (me: string): HousePorts<Shop> => ({
    me,
    limits: { recentLines: 20 },
    registry: options.registry ?? shopRegistry,
    state: () => identityView(rig.state(), me),
    act: (value, through) => rig.tools().act(value, through, me),
    now: () => 0,
  });
  return { rig, ports, tools: (me: string, words: SurfaceWords = shopWords) => houseTools(ports(me), words) };
};
const named = (tools: ReturnType<typeof houseTools>, id: string) => must(tools.find(tool => tool.id === id));
const rowsOf = (tools: ReturnType<typeof houseTools>, id: string, target?: string) =>
  named(tools, id)
    .view(target)
    .flatMap(stack => stack.rows.map(row => [row.title, row.detail ?? ""]));

describe("a house's tools on a surface", () => {
  it("names each tool in the product's words and says who holds it", () => {
    const { tools } = open({ grants: { ana: ["sales", "payments"], beto: ["sales"] } });
    expect(tools("ana").map(tool => [tool.name, tool.place.key, tool.held?.()])).toEqual([
      ["Ventas", "v", true],
      ["Pagos", "p", true],
    ]);
    expect(tools("beto").map(tool => tool.held?.())).toEqual([true, false]);
    expect(named(tools("ana"), "sales").view()).toEqual([{ title: "Registradas", rows: [], empty: "Sin ventas." }]);
  });

  it("walks an act field by field from its schema, and runs it through the house as that identity", async () => {
    const { rig, tools } = open();
    const register = must(named(tools("ana"), "sales").acts.register);
    expect(register.label).toBe("Registrar");
    const sale = must(register.next([]));
    expect(sale).toMatchObject({ ask: "Venta", kind: "text" });
    const total = must(register.next(["s1"]));
    expect(total.ask).toBe("Total");
    expect([total.valid?.("abc"), total.valid?.("1500")]).toEqual([false, true]);
    expect(register.next(["s1", "1500"])).toBeNull();
    expect(await register.run(["s1", "1500"])).toEqual({ ok: true, text: "Sale s1" });
    expect(rig.state().tools.sales.get("s1")).toEqual({ total: 1500, paid: 0, by: "ana" });
    expect(await register.run(["s1", "1500"])).toEqual({ ok: false, reason: "repeated" });
  });

  it("lists what the tool lists, opens each thing, and reads its facts under the product's labels", async () => {
    const { tools } = open();
    const surface = tools("ana");
    await must(named(surface, "sales").acts.register).run(["s1", "1500"]);
    expect(named(surface, "sales").summary()).toBe("1");
    const [listed] = named(surface, "sales").view();
    expect(listed?.rows).toEqual([{ title: "s1", detail: "$ 1500", opens: "sales/s1" }]);
    expect(named(surface, "sales").titleOf?.("sales/s1")).toBe("s1");
    expect(named(surface, "sales").view("sales/s1")[0]?.title).toBe("Datos");
    expect(rowsOf(surface, "sales", "sales/s1")).toEqual([
      ["Total", "$ 1500"],
      ["Cobrado", "$ 0"],
      ["Registró", "ana"],
    ]);
    expect(() => named(surface, "sales").view("sales/nothing")).toThrow("sales has no sales/nothing");
  });

  it("leaves out an optional field left empty, and says what the product says the act did", async () => {
    const { rig, tools } = open();
    const receive = must(named(tools("ana"), "payments").acts.receive);
    expect(receive.next(["p1", "100"])?.ask).toBe("Venta · opcional");
    expect(receive.next(["p1", "100"])?.valid?.("")).toBe(true);
    expect(await receive.run(["p1", "100", ""])).toEqual({ ok: true, text: "Recibido" });
    expect(rig.facts().findLast(event => event.kind === "payment-received")?.data).toEqual({
      payment: "p1",
      amount: 100,
    });
    expect(rowsOf(tools("ana"), "payments")).toEqual([
      ["Recibido", "$ 100"],
      ["Sin conciliar", "p1"],
    ]);
  });

  it("refuses through the house, never on its own: a tool that is not yours gets the house's cause", async () => {
    const { tools } = open({ grants: { ana: ["sales", "payments"], beto: ["sales"] } });
    const receive = must(named(tools("beto"), "payments").acts.receive);
    expect(receive.available?.()).toBe(false);
    expect(await receive.run(["p1", "100", ""])).toEqual({ ok: false, reason: toolTexts.unassigned });
  });

  it("says a tool calls you until you look at it, and looking is attending it", async () => {
    const { rig, tools } = open();
    const ana = tools("ana");
    await must(named(tools("beto"), "sales").acts.register).run(["s1", "10"]);
    expect(named(ana, "sales").calls?.()).toBe(true);
    expect(named(ana, "payments").calls?.()).toBe(false);
    named(ana, "sales").rendered?.();
    expect(named(ana, "sales").calls?.()).toBe(false);
    expect(identityView(rig.state(), "ana").attends).toEqual(["sales"]);
  });
});

describe("a product's words", () => {
  const nothing = Type.Object({});
  const desk: HouseTool<Shop> = {
    id: "desk",
    purpose: "A tool of the test.",
    targets: () => [],
    view: () => JSON.stringify({ drawer: "open" }),
    summary: () => "",
    acts: { tidy: toolAct(nothing, () => ({ status: "accepted", text: "Tidy" })) },
  };
  const words = { name: "Mostrador", key: "m", empty: "", listed: "Hoy", shown: "Datos" };
  const withDesk = (desk: SurfaceWords[string]) => ({ ...shopWords, desk });

  it("are required: a tool, an act or a field without them is named as a defect, never shown by its code", () => {
    const { tools } = open({ registry: [...shopRegistry, desk] });
    expect(() => tools("ana")).toThrow("No words for the tools desk");
    const noAct = withDesk({ ...words, acts: {}, done: {}, fields: {} });
    expect(() => tools("ana", noAct)).toThrow("desk has no words for act tidy");
    const noField = withDesk({ ...words, acts: { tidy: "Ordenar" }, done: {}, fields: {} });
    expect(() => named(tools("ana", noField), "desk").view()).toThrow("desk has no words for field drawer");
    const whole = withDesk({ ...words, acts: { tidy: "Ordenar" }, done: {}, fields: { drawer: "Cajón" } });
    expect(rowsOf(tools("ana", whole), "desk")).toEqual([["Cajón", "open"]]);
  });

  it("ask to confirm an act that needs nothing else, and hide what a secret field is given", () => {
    const key = Type.Object({ value: Type.String({ minLength: 12, secret: true }) });
    const keyed = {
      ...desk,
      acts: { ...desk.acts, lock: toolAct<Shop, typeof key>(key, () => ({ status: "accepted" })) },
    };
    const { tools } = open({ registry: [...shopRegistry, keyed] });
    const all = { ...words, acts: { tidy: "Ordenar", lock: "Cerrar" }, done: {}, fields: { value: "Clave" } };
    const surface = named(tools("ana", withDesk(all)), "desk");
    expect(surface.acts.tidy?.next([])).toMatchObject({ ask: "Ordenar · confirmar", kind: "confirm" });
    expect(surface.acts.tidy?.next(["Ordenar"])).toBeNull();
    expect(surface.acts.lock?.next([])).toMatchObject({ ask: "Clave", kind: "secret" });
  });
});
