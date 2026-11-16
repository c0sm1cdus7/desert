import { failing } from "../../../../tests/support/failed-checks.ts";
// A field that knows when what it was given is wrong: said where it is written, and kept out of the act.
import { describe, expect, it } from "vitest";
import type { Screen } from "../../../surface/contract/contract.ts";
import { seated, type, view } from "../promised-keys.ts";
import { cast, staged } from "../promised-stage.ts";
import { programChecks } from "../../program-checks.ts";
import { checkingShop, undeclaredShop, wrongName } from "../../../../tests/support/checking-shop.ts";
import { shopShown } from "../../../../tests/support/shop.ts";

/** What a person reads of a question: what was said so far, and what is written. */
const read = ({ title, body }: Screen): string[] => {
  if (body.kind !== "thread") return [title];
  const said = body.events.map(event => event.text.map(span => span.text).join(""));
  return [title, ...said, ...(body.entry ? [`› ${body.entry.typed}`] : [])];
};

describe("a program with a field that knows what is wrong", () => {
  for (const check of programChecks(checkingShop, shopShown)) it(check.name, check.run);

  it("keeps what is complete and wrong where it was written, saying why; corrected, it goes on", () =>
    staged(checkingShop, ({ house }) => {
      const { router } = seated(house(), cast.admin, shopShown);
      const now = (): string[] => read(router.screen(view));
      type(router, "pax7");
      /** Complete and wrong, it says why as soon as it is written, under the question, which stays. */
      expect(now()).toEqual(["Anotar", "Pago", "name", "› x7"]);
      router.send({ kind: "confirm" });
      expect(now()).toEqual(["Anotar", "Pago", "name", "› x7"]);
      /** What it says is of what is written now: still wrong, it says so; with nothing written, it says nothing. */
      router.send({ kind: "erase" });
      expect(now()).toEqual(["Anotar", "Pago", "name", "› x"]);
      router.send({ kind: "erase" });
      expect(now()).toEqual(["Anotar", "Pago", "› "]);
      /** A space before anything, or next to another, is not typed: what reads the same is written the same. */
      type(router, " p  7");
      expect(now()).toEqual(["Anotar", "Pago", "› p 7"]);
      for (let erased = 0; erased < 3; erased++) router.send({ kind: "erase" });
      /** Enter is not offered for an empty field; trying it explains what is missing without advancing. */
      router.send({ kind: "confirm" });
      expect(now()).toEqual(["Anotar", "Pago", "falta completar", "› "]);
      type(router, "p7");
      router.send({ kind: "confirm" });
      expect(now()).toEqual(["Anotar", "Pago p7", "Monto", "› "]);
      router.stop();
      return Promise.resolve();
    }));

  it("fails the cases of an act that does not declare the cause its field refuses with", async () => {
    const failed = await failing(programChecks(undeclaredShop, shopShown), name =>
      name.includes("promises a case")
        ? "Declared causes differ from the cases"
        : "E-PROG-1 · Falló el programa · anotar",
    );
    expect(failed).toContain(wrongName);
    expect(failed).toContain("payments · note · promises a case for what it does and for each cause it refuses with");
  });
});
