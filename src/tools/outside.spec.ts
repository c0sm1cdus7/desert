// The literal world causes close run's result type; a compiling dishonest implementation still fails at runtime.
import { describe, expect, expectTypeOf, it } from "vitest";
import { object } from "../catalogs/acts.ts";
import { programAct } from "./promises.ts";
import { OutsideDefect, type RunResult } from "./outside.ts";
import { cast, perform, staged } from "../programs/promised-stage.ts";
import { registerOffer, salesTool, paymentsTool, shopProgram, type Shop } from "../../tests/support/shop.ts";

const input = object({});
const outside = ["no paper", "printer offline"] as const;
type Result = RunResult<Shop, typeof outside>;
type Declared = Parameters<typeof programAct<Shop, typeof input, typeof outside>>[0];
const good = { promise: "it prints", input: {}, then: { says: "Printed", facts: [] } };
const printing = (run: Declared["run"]) =>
  programAct<Shop, typeof input, typeof outside>({ ...registerOffer, input, outside, run, cases: [good] });
/** Reflection simulates untyped code without weakening the declaration or hiding a compiler error. */
const forged = (reason: string): RunResult<Shop, readonly []> => {
  const result = { status: "accepted" as const };
  Reflect.set(result, "status", "rejected");
  Reflect.set(result, "reason", reason);
  return result;
};
const shopWith = (run: Declared["run"]) => ({
  ...shopProgram,
  registry: [{ ...salesTool, acts: { print: printing(run) } }, paymentsTool],
});

describe("run only reports the world causes it declares", () => {
  it("rejects an internal cause, a widened cause, and other terminal statuses by type", () => {
    expectTypeOf<{ status: "rejected"; reason: "repeated" }>().not.toExtend<Result>();
    expectTypeOf<{ status: "rejected"; reason: string }>().not.toExtend<Result>();
    expectTypeOf<{ status: "inconclusive" }>().not.toExtend<Result>();
    expectTypeOf<{ status: "interrupted"; reason: "no paper" }>().not.toExtend<Result>();
    expectTypeOf<{ status: "rejected"; reason: "no paper" }>().toExtend<Result>();
    expectTypeOf<{ status: "rejected"; reason: "no paper · tray 2" }>().toExtend<Result>();
    expectTypeOf<{ status: "rejected"; reason: "no paper" }>().not.toExtend<RunResult<Shop, readonly []>>();
    expectTypeOf<
      Parameters<typeof programAct<Shop, typeof input, readonly string[]>>[0]["outside"]
    >().toEqualTypeOf<never>();
  });

  it.each(["no paper", "printer offline", "no paper · tray 2"] as const)(
    "accepts the declared cause %s",
    async reason => {
      await staged(
        shopWith(() => ({ status: "rejected", reason })),
        async ({ house }) => {
          expect(await perform(house(), "sales", { act: "print", input: {} })).toMatchObject({
            status: "rejected",
            reason,
          });
        },
      );
    },
  );

  it.each(["repeated", "sin cambios", "no paperclip", ""])("throws visibly for a forged cause %s", async reason => {
    await staged(
      shopWith(() => forged(reason)),
      async ({ house }) => {
        await expect(perform(house(), "sales", { act: "print", input: {} })).rejects.toBeInstanceOf(OutsideDefect);
      },
    );
  });

  it("also throws through async execution instead of turning the defect into an ordinary refusal", async () => {
    await staged(
      shopWith(() => Promise.resolve(forged("repeated"))),
      async ({ house }) => {
        await expect(perform(house(), "sales", { act: "print", input: {}, by: cast.admin })).rejects.toBeInstanceOf(
          OutsideDefect,
        );
      },
    );
  });
});
