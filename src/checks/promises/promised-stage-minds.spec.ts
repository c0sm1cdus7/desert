import { expect, it } from "vitest";
import { program, shown } from "../../../tests/support/shop-program.ts";
import { programChecks } from "../program-checks.ts";
import { staged } from "./promised-stage.ts";
const first = program.registry[0]?.id ?? "";
const minded = { ...program, mentes: { asistentes: false, programas: [first] } };
it("opens a staged house for a composition that turns on a program mind, with its minds off", async () => {
  await staged(minded, ({ house }) => {
    expect(house().tools.state().house.grants.size).toBeGreaterThan(0);
    return Promise.resolve();
  });
});
it("runs the program checks of a distribution that turns on a program mind, opening its houses", async () => {
  const checks = programChecks(minded, shown);
  expect(checks.map(check => check.name)).toEqual(programChecks(program, shown).map(check => check.name));
  for (const check of checks.slice(0, 3)) await check.run();
});
