import { Type } from "@sinclair/typebox";
import { expect, it, vi } from "vitest";
import { object } from "../catalogs/acts.ts";
import { holding, text, thing } from "../catalogs/fields.ts";
import { openingFixture, openingCase } from "../../tests/support/opening-cleanup.ts";
import { shopShown } from "../../tests/support/shop.ts";
import { openingChecks } from "./coverage/opening-checks.ts";
import { defaultsIn } from "./promised-laws.ts";

it("checks at the case instant after its elapsed days", async () => {
  const at = 1_700_000_000_000;
  const { also } = openingFixture();
  const field = holding(text("Detalle", "Detalle del pago"), (_value, now) =>
    now === at + 86_400_000 ? "cerrado" : undefined,
  );
  const { program, aim } = openingFixture({
    input: object({ sale: thing("Venta", "sales", undefined, undefined, "sin ventas"), detail: field }),
    cases: [{ ...openingCase, at, given: [...openingCase.given, { days: 1 }] }],
    also: { ...also, opens: () => ({ detail: "ahora" }) },
  });
  await expect(openingChecks(program, aim, shopShown)).rejects.toThrow(/detail.*ahora/u);
});
it("checks as the case identity instead of always as the administrator", async () => {
  const { also } = openingFixture();
  const { program, aim } = openingFixture({
    cases: [{ ...openingCase, by: "beto" }],
    also: { ...also, opens: state => ({ amount: state.by === "beto" ? 0 : 1 }) },
  });
  await expect(openingChecks(program, aim, shopShown)).rejects.toThrow(/amount.*0/u);
});
it("does not calculate a suggestion for someone who does not hold the tool", async () => {
  const { also } = openingFixture();
  const opens = vi.fn(() => ({ amount: 0 }));
  const { program, aim } = openingFixture({ cases: [{ ...openingCase, by: "carla" }], also: { ...also, opens } });
  await expect(openingChecks(program, aim, shopShown)).resolves.toBeUndefined();
  expect(opens).not.toHaveBeenCalled();
});
it.each([0, 1, 2])("checks case position %i, not just an end of the list", async position => {
  const { also } = openingFixture();
  const { program, aim } = openingFixture({
    cases: [0, 1, 2].map(index => ({ ...openingCase, by: index === position ? "beto" : "ana" })),
    also: { ...also, opens: state => ({ amount: state.by === "beto" ? 0 : 1 }) },
  });
  await expect(openingChecks(program, aim, shopShown)).rejects.toThrow(/amount.*0/u);
});
it("checks every origin thing, including a later invalid one", async () => {
  const { also } = openingFixture();
  const { program, aim } = openingFixture({
    cases: [
      {
        ...openingCase,
        given: [...openingCase.given, { act: "register", on: "sales", input: { sale: "s2", total: 90 } }],
      },
    ],
    also: { ...also, opens: (_state, target) => ({ amount: target === "sales/s2" ? 0 : 1 }) },
  });
  await expect(openingChecks(program, aim, shopShown)).rejects.toThrow(/amount.*0/u);
});
it("skips unavailable destinations and preserves short circuit evaluation", async () => {
  const { also } = openingFixture();
  const opens = vi.fn(() => ({ amount: 0 }));
  const off = vi.fn(() => {
    throw new Error("later rule");
  });
  const { program, aim } = openingFixture({
    offered: () => "paid",
    also: { ...also, off, opens },
  });
  await expect(openingChecks(program, aim, shopShown)).resolves.toBeUndefined();
  expect(opens).not.toHaveBeenCalled();
  expect(off).not.toHaveBeenCalled();
});
it("uses the receiver, origin and destination of the actual row", async () => {
  const { also } = openingFixture();
  const at = 1_700_000_000_000;
  const offered = vi.fn<NonNullable<typeof also.off>>((_state, target, now) => {
    expect([target, now]).toEqual(["payments", at]);
    return undefined;
  });
  const off = vi.fn<NonNullable<typeof also.off>>((_state, target, now) => {
    expect([target, now]).toEqual(["sales/s1", at]);
    return undefined;
  });
  const withOrigin = vi.fn<typeof also.with>((_state, target, now) => {
    expect([target, now]).toEqual(["sales/s1", at]);
    return { sale: target };
  });
  const opens = vi.fn(function (this: typeof also, state: Parameters<typeof also.with>[0], target: string) {
    expect(this.with).toBe(withOrigin);
    expect([state.by, target]).toEqual(["beto", "sales/s1"]);
    return { amount: 1, ignored: 0 };
  });
  const { program, aim } = openingFixture({
    cases: [{ ...openingCase, at, by: "beto" }],
    offered,
    also: { ...also, with: withOrigin, off, opens },
  });
  await expect(openingChecks(program, aim, shopShown)).resolves.toBeUndefined();
  for (const read of [offered, off, withOrigin, opens]) expect(read).toHaveBeenCalledTimes(1);
});
it("allows absent static defaults too", () => {
  expect(() => defaultsIn({ ...Type.String(), default: undefined })).not.toThrow();
});
