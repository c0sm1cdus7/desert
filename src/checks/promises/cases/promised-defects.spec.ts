// Compiling broken programs must finish visibly, preserve support detail, and fail their derived gate.
import { meant, said } from "../../../fields/phrases.ts";
import { describe, expect, it } from "vitest";
import { object } from "../../../fields/visible-text.ts";
import { text } from "../../../fields/fields.ts";
import { effect } from "../../../house/facts.ts";
import type { Event } from "../../../journal/vocabulary.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import { programAct } from "../../../tools/promises.ts";
import {
  registerOffer,
  salesTool,
  paymentsTool,
  shopProgram,
  shopShown,
  type Shop,
} from "../../../../tests/support/shop.ts";
import { seated } from "../promised-keys.ts";
import { programChecks } from "../../program-checks.ts";
import { perform, staged, wroteSince } from "../promised-stage.ts";

const input = object({ receipt: text("Recibo", "Nombre del recibo") });
const outside = ["printer offline"] as const;
type Run = Parameters<typeof programAct<Shop, typeof input, typeof outside>>[0]["run"];
const runs: Readonly<Record<string, Run>> = {
  thrown: () => {
    throw new Error("repeated");
  },
  rejected: () => Promise.reject(new Error("sin stock")),
  undeclared: () => {
    const result = { status: "accepted" as const, effects: [effect("boot", {}, "ana")] };
    Reflect.set(result, "status", "rejected");
    Reflect.set(result, "reason", "repeated");
    return result;
  },
};
const broken = (run: Run) => ({
  ...shopProgram,
  registry: [
    {
      ...salesTool,
      acts: {
        ...salesTool.acts,
        print: programAct<Shop, typeof input, typeof outside>({
          ...registerOffer,
          name: "imprimir",
          enter: "imprimir",
          key: "i",
          input,
          outside,
          run,
          cases: [
            { promise: "prints", input: { receipt: "receipt" }, then: { says: "Impreso · Recibo", facts: [] } },
            { promise: "offline", input: { receipt: "offline" }, then: { refused: "printer offline" } },
          ],
        }),
      },
    },
    paymentsTool,
  ],
});

describe("a program defect is never the thrown cause on the action", () => {
  for (const [name, run] of Object.entries(runs)) {
    it(`${name}: finishes once, writes no program facts and keeps support detail after reopening`, () =>
      staged(broken(run), async ({ house, reopen }) => {
        const before = house().tools.state().through;
        const done = await perform(house(), "sales", { act: "print", input: { receipt: "receipt" } });
        expect(done).toMatchObject({ status: "rejected", defect: true, reason: toolTexts.defect("imprimir") });
        expect(wroteSince(house(), before)).toEqual([]);
        const events = () => house().journal.replay<Event<Shop["fact"]>[]>([], (all, event) => [...all, event], before);
        const recorded = events();
        expect(recorded.filter(event => event.kind === "act-started" && event.data.option === "print")).toHaveLength(1);
        const entry = recorded.find(event => event.kind === "tool-entry");
        expect(entry?.data).toMatchObject({ text: done.reason, detail: { action: "print" } });
        expect(JSON.stringify(entry?.data.detail)).toContain(name === "rejected" ? "sin stock" : "repeated");
        const seat = seated(house(), "beto", shopShown);
        try {
          const news = seat.tools.find(tool => tool.id === "sales")?.notices?.().news;
          expect(JSON.stringify(news)).toContain(name === "rejected" ? "sin stock" : "repeated");
        } finally {
          seat.router.stop();
        }
        expect(house().tools.state().processing.size).toBe(0);
        reopen();
        expect(events().slice(0, recorded.length)).toEqual(recorded);
      }));
    it(`${name}: fails declared successes and outside refusals through both derived doors`, async () => {
      const checks = programChecks(broken(run), shopShown).filter(check =>
        / · (prints|offline)(, by keys)?$/.test(check.name),
      );
      expect(checks).toHaveLength(4);
      for (const check of checks) await expect(check.run()).rejects.toThrow("E-PROG-1 · The program failed · imprimir");
    });
  }
  it("does not accept a defect even if a declared outside case promises the fixed public text", async () => {
    const program = broken(() => {
      throw new Error("printer offline");
    });
    const act = program.registry[0]?.acts.print;
    if (!act) throw new Error("Missing printer");
    const reason = toolTexts.defect("imprimir");
    Reflect.set(act, "outside", [reason]);
    Reflect.set(act, "cases", [{ promise: "misclassified", input: { receipt: "receipt" }, then: { refused: reason } }]);
    const checks = programChecks(program, shopShown).filter(check => / · misclassified(, by keys)?$/.test(check.name));
    expect(checks).toHaveLength(2);
    for (const check of checks) await expect(check.run()).rejects.toThrow(meant(reason));
  });

  it("does not promise no changes when a nested act already wrote", () =>
    staged(
      broken(async (_, context) => {
        const done = await context.execute?.({
          act: "register",
          target: "sales",
          input: { sale: "nested", total: 100 },
        });
        expect(done?.status).toBe("accepted");
        throw new Error("after nested success");
      }),
      async ({ house }) => {
        const before = house().tools.state().through;
        const done = await perform(house(), "sales", { act: "print", input: { receipt: "receipt" } });
        expect(done.defect).toBe(true);
        expect(wroteSince(house(), before)).toHaveLength(1);
        expect(done.reason).toEqual(toolTexts.defect("imprimir"));
        expect(said(done.reason ?? "", "es")).not.toContain("no se guardó nada");
      },
    ));
});
