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
  const ordinary = (name: string) =>
    program.registry.some(tool => name.startsWith(`${tool.id} · `)) && !name.includes("assign-mind-card");
  expect(checks.map(check => check.name).filter(ordinary)).toEqual(
    programChecks(program, shown)
      .map(check => check.name)
      .filter(ordinary),
  );
  expect(checks.some(check => check.name.startsWith(`${first} · assign-mind-card ·`))).toBe(true);
  for (const check of checks.slice(0, 3)) await check.run();
});
