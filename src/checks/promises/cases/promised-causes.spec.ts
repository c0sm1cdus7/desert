// An undeclared cause in any previous rule is a program defect on execution and while the person answers.
import { said } from "../../../fields/phrases.ts";
import { describe, expect, it } from "vitest";
import { object } from "../../../fields/visible-text.ts";
import { holding, text, thing } from "../../../fields/fields.ts";
import { programAct, type Composition } from "../../../tools/promises.ts";
import {
  shopProgram,
  shopShown,
  paymentsTool,
  salesTool,
  registerOffer,
  type Shop,
} from "../../../../tests/support/shop.ts";
import { cast, given, perform, staged, wroteSince } from "../promised-stage.ts";
import { seated, type, view } from "../promised-keys.ts";
import { programChecks } from "../../program-checks.ts";

type Mode = "offered" | "stops" | "wrong" | "among";
const detail = "causa no declarada";
const initial = [{ act: "register", on: "sales", input: { sale: "s1", total: 100 } }];
function broken(mode: Mode): Composition<Shop> {
  const value = mode === "among" ? "sales/s1" : "datum";
  const written = mode === "wrong" ? holding(text("Dato", "Nombre"), () => detail) : text("Dato", "Nombre");
  const field = mode === "among" ? thing("Dato", "sales", undefined, undefined, "sin ventas") : written;
  const input = object({ value: field });
  const act = programAct<Shop, typeof input>({
    ...registerOffer,
    name: "probar",
    enter: "probar",
    key: "b",
    input,
    ...(mode === "offered" ? { offered: () => detail } : {}),
    ...(mode === "stops" ? { stops: answered => (answered.value ? detail : undefined) } : {}),
    ...(mode === "among" ? { among: () => ({ sales: () => detail }) } : {}),
    run: () => ({ status: "accepted", text: "Probado · Dato" }),
    cases: [{ promise: "works", given: initial, input: { value }, then: { says: "Probado · Dato", facts: [] } }],
  });
  return { ...shopProgram, registry: [salesTool, { ...paymentsTool, acts: { ...paymentsTool.acts, probe: act } }] };
}
for (const mode of ["offered", "stops", "wrong", "among"] satisfies readonly Mode[]) {
  describe(`undeclared ${mode}`, () => {
    it("records the diagnostic and fixed program defect without entering run, even after reopening", () =>
      staged(broken(mode), async ({ house, reopen }) => {
        await given(house(), "payments", initial);
        const before = house().tools.state().through;
        const done = await perform(house(), "payments", {
          act: "probe",
          input: {
            value: mode === "among" ? "sales/s1" : "datum",
          },
        });
        expect(done).toMatchObject({
          status: "rejected",
          defect: true,
          reason: { en: "E-PROG-1 · The program failed · probar", es: "E-PROG-1 · Falló el programa · probar" },
        });
        expect(wroteSince(house(), before)).toEqual([]);
        reopen();
        expect(house().tools.state().processing.size).toBe(0);
        const entries = house()
          .tools.state()
          .entries.filter(entry => said(entry.data.text, "es").includes("E-PROG-1"));
        expect(entries).toHaveLength(1);
        expect(JSON.stringify(entries[0]?.data.detail)).toContain(detail);
      }));
    it("shows the fixed defect while painting or answering and logs the cause once", () =>
      staged(broken(mode), async ({ house }) => {
        await given(house(), "payments", initial);
        const seat = seated(house(), cast.admin, shopShown);
        try {
          type(seat.router, "pb");
          if (mode === "wrong" || mode === "stops") type(seat.router, "datum");
          const screen = JSON.stringify(seat.router.screen(view));
          expect(screen).toContain("E-PROG-1");
          expect(screen).not.toContain(detail);
          seat.router.screen(view);
          expect(seat.requests).toEqual([]);
          expect(seat.defects).toHaveLength(1);
          expect(JSON.stringify(house().tools.state().entries)).toContain(detail);
        } finally {
          seat.router.stop();
        }
      }));
    it("fails both derived doors instead of accepting the undeclared refusal as an outside error", async () => {
      const checks = programChecks(broken(mode), shopShown).filter(check => / · works(, by keys)?$/.test(check.name));
      expect(checks).toHaveLength(2);
      for (const check of checks) {
        const onMenu = check.name.endsWith(", by keys") && (mode === "offered" || mode === "among");
        await expect(check.run()).rejects.toThrow(
          `E-PROG-1 · The program failed · ${onMenu ? "payments/payments" : "probar"}`,
        );
      }
    });
  });
}
it("a broken program fold records a defect and rolls back its facts instead of exposing an ordinary error", () => {
  const program = {
    ...shopProgram,
    slices: {
      ...shopProgram.slices,
      step: {
        ...shopProgram.slices.step,
        sales: (...args: Parameters<typeof shopProgram.slices.step.sales>) => {
          if (args[1].kind === "sale-registered") throw new Error("broken fold");
          return shopProgram.slices.step.sales(...args);
        },
      },
    },
  };
  return staged(program, async ({ house }) => {
    const before = house().tools.state().through;
    const done = await perform(house(), "sales", { act: "register", input: { sale: "s1", total: 100 } });
    expect(done).toMatchObject({
      status: "rejected",
      defect: true,
      reason: { en: "E-PROG-1 · The program failed · registrar", es: "E-PROG-1 · Falló el programa · registrar" },
    });
    expect(wroteSince(house(), before)).toEqual([]);
    expect(JSON.stringify(house().tools.state().entries)).toContain("broken fold");
  });
});
