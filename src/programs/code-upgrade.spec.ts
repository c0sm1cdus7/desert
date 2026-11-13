import "../../tests/support/upgrade-vault.ts";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { CodeProjectionVersion, codeProjectionVersion } from "./calculation-version.ts";
import { keptChecks } from "./kept-journals.ts";
import { shopShown } from "../../tests/support/shop.ts";
import { home, kept, legacy, open, program, seed } from "../../tests/support/upgrade-support.ts";
async function check(current: ReturnType<typeof program>, folder: string) {
  const checks = keptChecks(current, shopShown, folder);
  for (const check of checks) await check.run();
  return checks.map(check => check.report?.()).filter(Boolean);
}
it("code mode proves reconstruction after a calculation change without reusable evidence", async () => {
  const root = home();
  const code = join(root, "calculation.ts");
  writeFileSync(code, "const factor = 1;");
  const previous = codeProjectionVersion([root]);
  const path = home();
  await seed(path, program(previous));
  const folder = kept(path);
  writeFileSync(code, "const factor = 2;");
  const version = codeProjectionVersion([root]);
  expect(version.value).not.toBe(previous.value);
  const current = program(version, 2);
  expect(await check(current, folder)).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/shop.sqlite: RECONSTRUIDO.*cambio de código: huella distinta y RECONSTRUIDO/),
    ]),
  );
  const house = open(path, current);
  try {
    expect(house.tools.state().tools.sales.get("s1")?.total).toBe(20);
  } finally {
    house.close();
  }
});
it("code mode accepts legacy folds and standalone sources, and reports actual reuse when available", async () => {
  const source = join(home(), "calculation.ts");
  writeFileSync(source, "const factor = 1;");
  const current = program(codeProjectionVersion([source]));
  const path = home();
  legacy(path, "19a0b47");
  expect(await check(current, kept(path))).toEqual(expect.arrayContaining([expect.stringMatching(/RECONSTRUIDO/)]));
  const fresh = home();
  await seed(fresh, current);
  expect(await check(current, kept(fresh))).toEqual(expect.arrayContaining([expect.stringMatching(/REUTILIZADO/)]));
});
it("cannot label an arbitrary string as a code-derived version or compose stale code", async () => {
  expect(() => new CodeProjectionVersion([])).toThrow();
  const source = join(home(), "calculation.ts");
  writeFileSync(source, "1");
  const current = program(codeProjectionVersion([source]));
  const path = home();
  await seed(path, current);
  writeFileSync(source, "2");
  await expect(check(current, kept(path))).rejects.toThrow(/changed after composition/);
});
