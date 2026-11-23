// Methods keep their owning declaration through every program callback boundary.
import { object } from "../../fields/visible-text.ts";
import { thing } from "../../fields/fields.ts";
import { expect, it } from "vitest";
import { shopProgram, shopShown, salesTool, paymentsTool, type Shop } from "../../../tests/support/shop.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { cast, given, staged, perform } from "./promised-stage.ts";
import { programAct, type ProgramTool } from "../../tools/promises.ts";

it("calls view, targets, summary, words, needs and action methods with their owner", () =>
  staged(shopProgram, async ({ house }) => {
    await given(house(), "sales", [{ act: "register", input: { sale: "s1", total: 100 } }]);
    const calls: string[] = [];
    const register = salesTool.acts.register;
    if (!register) throw new Error("missing register");
    const action = {
      ...register,
      input: object({ sale: thing("Venta", "sales", undefined, undefined, "sin ventas") }),
      today() {
        expect(this).toBe(action);
        calls.push("today");
        return { sale: "s1", total: 100 };
      },
      datum() {
        expect(this).toBe(action);
        calls.push("datum");
        return "sale";
      },
      among() {
        expect(this).toBe(action);
        calls.push("among");
        return {};
      },
      confirms() {
        expect(this).toBe(action);
        calls.push("confirms");
        return "Registrar venta";
      },
    };
    const owned: ProgramTool<Shop> = {
      ...salesTool,
      acts: { ...salesTool.acts, register: action },
      targets(state) {
        expect(this).toBe(owned);
        calls.push("targets");
        return salesTool.targets(state);
      },
      view(state, target, limits) {
        expect(this).toBe(owned);
        calls.push("view");
        return salesTool.view(state, target, limits);
      },
      summary(state) {
        expect(this).toBe(owned);
        calls.push("summary");
        return salesTool.summary(state);
      },
      findWords() {
        expect(this).toBe(owned);
        calls.push("words");
        return "sale";
      },
      needs() {
        expect(this).toBe(owned);
        calls.push("needs");
        return [];
      },
    };
    const ports = localPorts(house(), cast.admin, { recentLines: 100 });
    const tools = houseTools(
      { ...ports, registry: [owned, ...house().registry.filter(t => t.id !== "sales")] },
      shopShown,
      "es",
    );
    const tool = tools.find(t => t.id === "sales");
    expect(tool).toBeDefined();
    tool?.view("sales/s1");
    tool?.has?.("sales/s1");
    tool?.summary();
    tool?.find?.("s1");
    tool?.notices?.();
    tool?.acts.register?.today?.();
    tool?.acts.register?.datum?.();
    tool?.acts.register?.next([]);
    tool?.acts.register?.next(["sales/s1"]);
    expect(new Set(calls)).toEqual(
      new Set(["view", "targets", "summary", "words", "needs", "today", "datum", "among", "confirms"]),
    );
  }));

it("preserves the original action declaration when programAct builds its callbacks", () => {
  const declaration = {
    name: "revisar",
    enter: "revisar",
    purpose: "una venta",
    key: "x",
    undoable: true,
    on: "tool" as const,
    input: object({ sale: thing("Venta", "sales", undefined, undefined, "sin ventas") }),
    cases: [
      { promise: "revises", input: { sale: "sales/s1" }, then: { says: "Revisada · Venta", facts: [] } },
    ] as const,
    stops() {
      expect(this).toBe(declaration);
      return undefined;
    },
    among() {
      expect(this).toBe(declaration);
      return {};
    },
    run() {
      expect(this).toBe(declaration);
      return { status: "accepted" as const, text: "Revisada · Venta" };
    },
    offered() {
      expect(this).toBe(declaration);
      return undefined;
    },
    today() {
      expect(this).toBe(declaration);
      return { sale: "sales/s2" };
    },
    datum() {
      expect(this).toBe(declaration);
      return "sale";
    },
    confirms() {
      expect(this).toBe(declaration);
      return "Revisar venta";
    },
  };
  const action = programAct<Shop, typeof declaration.input>(declaration);
  const program = {
    ...shopProgram,
    registry: [{ ...salesTool, acts: { ...salesTool.acts, review: action } }, paymentsTool],
  };
  return staged(program, async ({ house }) => {
    await given(house(), "sales", [{ act: "register", input: { sale: "s1", total: 100 } }]);
    const state = house().tools.state();
    expect(action.offered?.(state, "sales", 0)).toBeUndefined();
    expect(action.today?.(state, "sales", 0)).toEqual({ sale: "sales/s2" });
    expect(action.datum?.(state, "sales")).toBe("sale");
    expect(action.confirms?.({ sale: "sales/s1" }, state, "sales", 0)).toBe("Revisar venta");
    expect((await perform(house(), "sales", { act: "review", input: { sale: "sales/s1" } })).status).toBe("accepted");
  });
});
