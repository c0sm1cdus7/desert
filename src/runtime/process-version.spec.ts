import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { home } from "../../tests/support/upgrade-support.ts";
import { codeProjectionVersion } from "./calculation-version.ts";
import { projectionVersion } from "./projection-version.ts";
import { changedCode } from "../checks/code/code-version-check.ts";
it("pins the first fingerprint of a declaration for the process even across new compositions", () => {
  const file = join(home(), "fold.ts");
  writeFileSync(file, "export const factor = 1;");
  const first = codeProjectionVersion([file]);
  writeFileSync(file, "export const factor = 2;");
  expect(codeProjectionVersion([file]).value).toBe(first.value);
  expect(() => changedCode(first)).toThrow(/changed after composition/);
  const module = new URL("./calculation-version.ts", import.meta.url).href;
  const script = `import { codeProjectionVersion } from ${JSON.stringify(module)};
    console.log(codeProjectionVersion([${JSON.stringify(file)}]).value);`;
  const next = execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" }).trim();
  expect(next).toBe(projectionVersion([file]));
  expect(next).not.toBe(first.value);
});
it.each(["package.json", "pnpm-lock.yaml", "calculation.custom"])("includes an explicitly declared %s", name => {
  const file = join(home(), name);
  writeFileSync(file, "1");
  const before = projectionVersion([file]);
  writeFileSync(file, "2");
  expect(projectionVersion([file])).not.toBe(before);
});
it.each(["hidden", "outside", "extension", "dynamic"])("rejects a %s import outside the declaration", mode => {
  const root = home();
  const extra = mode === "hidden" ? join(root, ".generated") : home();
  mkdirSync(extra, { recursive: true });
  const file = join(extra, mode === "extension" ? "factor.json" : "factor.ts");
  writeFileSync(file, "export const factor = 2;");
  const statement =
    mode === "dynamic" ? `import(${JSON.stringify(file)})` : `import { factor } from ${JSON.stringify(file)}`;
  writeFileSync(join(root, "fold.ts"), `${statement};`);
  const version = codeProjectionVersion([root]);
  expect(() => changedCode(version)).toThrow(file);
});

it("follows an imported test-named calculation instead of exempting its dependencies", () => {
  const root = home();
  const outside = join(home(), "factor.ts");
  writeFileSync(outside, "export const factor = 2;");
  writeFileSync(join(root, "fold.ts"), 'export { factor } from "./factor.spec.ts";');
  writeFileSync(join(root, "factor.spec.ts"), `export { factor } from ${JSON.stringify(outside)};`);
  expect(() => changedCode(codeProjectionVersion([root]))).toThrow(outside);
});
it("names code with an import whose runtime path cannot be enumerated", () => {
  const file = join(home(), "fold.ts");
  writeFileSync(file, "export const load = path => import(path);");
  expect(() => changedCode(codeProjectionVersion([file]))).toThrow(file);
});
