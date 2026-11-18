import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { root, sourceFiles } from "../support/sources.ts";
import { virtualProgram } from "./secret-boundaries.ts";
import { programEntryExports, programEntryFiles } from "./program-entry-exports.ts";

const imported = 'import { startHouse } from "./runtime/host.ts";';
const forms = {
  direct: 'export { startHouse as alias } from "./runtime/host.ts";',
  variable: `${imported} export const alias = startHouse;`,
  parenthesized: `${imported} export const alias = (startHouse);`,
  satisfies: `${imported} export const alias = startHouse satisfies typeof startHouse;`,
  typed: `${imported} export const alias = startHouse as typeof startHouse;`,
  default: `${imported} export default startHouse;`,
  object: `${imported} export const host = { startHouse };`,
  destructured: 'import * as host from "./runtime/host.ts"; export const { startHouse: alias } = host;',
  namespace: 'export * as host from "./runtime/host.ts";',
  wrapper: `${imported} export const alias = () => startHouse();`,
  assertion: `${imported} export const alias = <typeof startHouse>startHouse;`,
  nonnull: `${imported} export const alias = startHouse!;`,
  nested: `${imported} export const alias = { outer: [{ inner: startHouse }] };`,
  spread: `${imported} const box = { startHouse }; export const alias = { ...box };`,
  arraySpread: `${imported} const box = [startHouse]; export const alias = [...box];`,
  objectBinding: `${imported} const box = { nested: { run: startHouse } };
    export const { nested: { run: alias } } = box;`,
  arrayBinding: `${imported} const box = [startHouse]; export const [alias] = box;`,
  restBinding: `${imported} const box = { run: startHouse }; export const { ...alias } = box;`,
  getter: `${imported} export const alias = { get run() { return startHouse; } };`,
  method: `${imported} export const alias = { run() { startHouse(); } };`,
  declaration: `${imported} export function alias() { return startHouse; }`,
  class: `${imported} export class Alias { run() { return startHouse; } }`,
  classField: `${imported} export const alias = class { static run = startHouse; };`,
  inheritance: `${imported} export class Alias extends startHouse {}`,
  helper: `${imported} const helper = () => startHouse; export const alias = () => helper();`,
  defaultWrapped: `${imported} export default (() => ({ run: startHouse }));`,
  conditional: `${imported} export const alias = true ? startHouse : undefined;`,
  computed: `${imported} const box = { run: startHouse }; export const alias = box["run"];`,
  parameterDefault: `${imported} export const alias = (run = startHouse) => run;`,
};
it.each(Object.entries(forms))("retains the host origin through %s", (_name, code) => {
  const sources = {
    "/base/src/runtime/host.ts": "export function startHouse() { return 123; }",
    "/base/src/entry.ts": code,
  };
  const found = programEntryExports(virtualProgram(sources, {}), "/base", { "desert/fields": "/base/src/entry.ts" });
  expect(
    found.some(reason => reason.startsWith("desert/fields →") && reason.includes("runtime/host.ts:startHouse")),
  ).toBe(true);
});

it.each(["houseRouter", "houseRouter satisfies typeof houseRouter"])(
  "rejects the auditor's real shownMoney mutation: %s",
  value => {
    const sources = Object.fromEntries(sourceFiles().map(file => [file, readFileSync(file, "utf8")]));
    const file = join(root, "src/fields/fields.ts");
    sources[file] =
      readFileSync(file, "utf8").replace(
        'export { money, shownMoney } from "./money-field.ts";',
        'export { money } from "./money-field.ts";',
      ) +
      '\nimport { houseRouter } from "../surface/bridge/assembly/house-router.ts";\n' +
      `export const shownMoney = ${value};`;
    const found = programEntryExports(virtualProgram(sources, {}), root, programEntryFiles(root));
    for (const entry of ["desert/fields", "desert/fields/fields"])
      expect(
        found.some(
          reason =>
            reason.startsWith(`${entry} → shownMoney`) &&
            reason.includes("surface/bridge/assembly/house-router.ts:houseRouter"),
        ),
      ).toBe(true);
  },
);

function inspect(code: string, extra: Readonly<Record<string, string>> = {}): string[] {
  return programEntryExports(virtualProgram({ "/base/src/entry.ts": code, ...extra }, {}), "/base", {
    "desert/fields": "/base/src/entry.ts",
  });
}
it("rejects a value with no resolvable origin instead of silently accepting its initializer", () => {
  expect(inspect("export const alias = (missing as unknown);")).toEqual([
    expect.stringContaining("cannot resolve value: missing"),
  ]);
});
it("reports the export, nested carrier and host origin", () => {
  const found = inspect(`${imported} export const box = { nested: [() => startHouse] };`, {
    "/base/src/runtime/host.ts": "export function startHouse() {}",
  });
  expect(found).toHaveLength(1);
  expect(found[0]).toMatch(/desert\/fields → box → ObjectLiteralExpression.*ArrayLiteralExpression.*ArrowFunction/);
  expect(found[0]).toContain("runtime/host.ts:startHouse");
});
it("terminates recursive helpers and still inspects a host on another branch", () => {
  expect(
    inspect(
      `${imported} function recur() { return true ? recur() : startHouse; }
    export const alias = () => recur();`,
      {
        "/base/src/runtime/host.ts": "export function startHouse() {}",
      },
    ).some(reason => reason.includes("runtime/host.ts:startHouse")),
  ).toBe(true);
});
it("accepts ordinary carriers, classes, getters, shadowing and type-only host references", () => {
  expect(
    inspect(
      `import type { startHouse } from "./runtime/host.ts";
    const value = 3; const box = { nested: [value] }; export const { nested: alias } = box;
    export const wrapped = ((box satisfies typeof box) as typeof box)!;
    export class Local { get run() { return value; } }
    export function caller(value: typeof startHouse) { return value; }
    export const optional = undefined;`,
      {
        "/base/src/runtime/host.ts": "export function startHouse() {}",
      },
    ),
  ).toEqual([]);
});
it("documents the ambient and caller-supplied leaves: no implementation or runtime arguments are inferred", () => {
  expect(
    inspect('import { factory } from "./external.d.ts"; export const value = factory();', {
      "/base/src/external.d.ts": "export declare function factory(): unknown;",
    }),
  ).toEqual([]);
  expect(inspect("export const caller = (value: { run: () => unknown }) => value.run();")).toEqual([]);
});
it("documents that mutations outside reachable declarations are not a runtime heap analysis", () => {
  expect(
    inspect(`${imported} const box = {}; Object.assign(box, { run: startHouse }); export { box };`, {
      "/base/src/runtime/host.ts": "export function startHouse() {}",
    }),
  ).toEqual([]);
});
it.each([
  ['export const value = import("./runtime/host.ts");', "cannot inspect dynamic import"],
  ['export const value = eval("1");', "cannot inspect dynamic code: eval"],
  ['export const value = new Function("return 1");', "cannot inspect dynamic code: Function"],
  ['const evaluate = eval; export const value = () => evaluate("1");', "cannot inspect dynamic code: eval"],
])("rejects opaque code construction: %s", (code, reason) => {
  expect(inspect(code)).toEqual([expect.stringContaining(reason)]);
});
it("keeps both host origins and each exported path through stacked wrappers", () => {
  const found = inspect(
    `import { first, second } from "./runtime/host.ts";
    const box = { nested: [...[first, second]] };
    const { nested: alias } = (box satisfies typeof box)!;
    export const left = (alias as typeof alias); export const right = () => alias;`,
    {
      "/base/src/runtime/host.ts": "export function first() {} export class second {}",
    },
  );
  for (const exported of ["left", "right"])
    for (const origin of ["first", "second"])
      expect(
        found.some(
          reason => reason.startsWith(`desert/fields → ${exported}`) && reason.endsWith(`runtime/host.ts:${origin}`),
        ),
      ).toBe(true);
});
it("documents that side-effect-only module initialization is outside the declaration graph", () => {
  expect(
    inspect('import "./effects.ts"; export const box = {};', {
      "/base/src/effects.ts": `${imported} import { box } from "./entry.ts";
      Object.assign(box, { run: startHouse });`,
      "/base/src/runtime/host.ts": "export function startHouse() {}",
    }),
  ).toEqual([]);
});
