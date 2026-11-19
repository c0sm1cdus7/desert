// Proves device imports, pure sharing and the house boundary before any program is evaluated.
import { readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { programImports } from "../../src/checks/laws/program-imports.ts";
import { groupTargetCauses } from "../../src/checks/promises/identities/group-checks.ts";
import { devicePackage } from "../support/device-package.ts";
import { loadProgram } from "../program/load.ts";
import { checkProgramCode } from "../program/code.ts";
import { programGroups } from "../program/registration.ts";

it("runs the complete gate of a standalone device program without a socket or provider", async () => {
  const repo = devicePackage();
  expect(programImports(repo)).toEqual([]);
  const composed = await loadProgram(repo.root);
  checkProgramCode(composed);
  for (const group of programGroups(composed))
    for (const check of group.checks) {
      try {
        await check.run();
      } catch (cause) {
        throw new Error(`${group.name}: ${check.name}`, { cause });
      }
    }
}, 180000);

it.each([
  'import "../device/index.ts";',
  'export * from "../device/index.ts";',
  'type Executor = import("../device/index.ts");',
  'const executor = import("../device/index.ts");',
  'const executor = require("../device/index.ts");',
  'const executor = require.resolve("../device/index.ts");',
  'import "node:fs";',
  'import "desert/doors/device-process";',
  'import "desert/runtime";',
  'import "desert/testing";',
])("rejects house capabilities even with a declared executor: %s", async code => {
  const repo = devicePackage();
  writeFileSync(join(repo.root, "src/forbidden.ts"), code);
  expect(programImports(repo)).toHaveLength(1);
  await expect(loadProgram(repo.root)).rejects.toThrow("src/forbidden.ts →");
});

it.each([
  'import "desert/runtime";',
  'import "desert/testing";',
  'import "../src/program.ts";',
  'import "../src/notes.ts";',
  'import "unknown-package";',
  "import(dynamicPath);",
])("rejects unrelated authority and impure house imports in the executor: %s", code => {
  const repo = devicePackage();
  writeFileSync(join(repo.root, "device/bad.ts"), code);
  expect(programImports(repo)).toHaveLength(1);
});

it.each(['import "../device/index.ts";', "export const io = process;", 'import "./notes.ts";'])(
  "rejects transitive impurity in shared schemas: %s",
  code => {
    const repo = devicePackage();
    writeFileSync(join(repo.root, "src/impure.ts"), code);
    const input = join(repo.root, "src/input.ts");
    writeFileSync(input, readFileSync(input, "utf8") + '\nimport "./impure.ts";');
    expect(programImports(repo)).toContain("device/index.ts → ../src/input.ts");
  },
);

it("follows symlinks when a house import disguises an executor", () => {
  const repo = devicePackage();
  symlinkSync(join(repo.root, "device/index.ts"), join(repo.root, "src/disguised.ts"));
  writeFileSync(join(repo.root, "src/bad.ts"), 'import "./disguised.ts";');
  expect(programImports(repo)).toContain("src/bad.ts → ./disguised.ts");
});

it.each([null, [], ["src"], ["missing"], ["../device"], ["device", "device"], ["/tmp"], ["tests"]])(
  "rejects an invalid or misleading device declaration: %j",
  declaration => {
    const repo = devicePackage();
    const path = join(repo.root, "package.json");
    const text = readFileSync(path, "utf8").replace('"device":["device"]', `"device":${JSON.stringify(declaration)}`);
    writeFileSync(path, text);
    expect(() => programImports(repo)).toThrow("desert.device:");
  },
);

it("checks foreign objects after asking for a device, and detects a broken group declaration", async () => {
  const composed = await loadProgram(devicePackage().root);
  const tool = composed.program.registry.find(tool => tool.id === "toy");
  expect(tool).toBeDefined();
  if (!tool) throw new Error("Missing toy");
  const act = tool.acts["notes/add"];
  if (!act) throw new Error("Missing action");
  const aim = { tool, act, name: "notes/add" };
  expect(await groupTargetCauses(composed.program, composed.shown, aim)).toHaveLength(1);
  const broken = {
    ...tool,
    groups: (tool.groups ?? []).map(group => ({ ...group, tool: { ...group.tool, id: "other" } })),
  };
  await expect(groupTargetCauses(composed.program, composed.shown, { ...aim, tool: broken })).rejects.toThrow();
});

it("admits built-in Node modules only in the device and pure named type/schema sharing", () => {
  const repo = devicePackage();
  writeFileSync(
    join(repo.root, "device/node.ts"),
    [
      'import "node:fs";',
      'import "node:child_process";',
      'import "fs/promises";',
      'export type { SpawnOptions } from "node:child_process";',
    ].join("\n"),
  );
  const schema = join(repo.root, "src/input.ts");
  writeFileSync(
    schema,
    readFileSync(schema, "utf8") +
      '\nimport type { TSchema } from "desert/programa"; export const labels = { process: "Proceso" };',
  );
  expect(programImports(repo)).toEqual([]);
  writeFileSync(join(repo.root, "device/node.ts"), 'import "node:invented";');
  expect(programImports(repo)).toContain("device/node.ts → node:invented");
});
it.each([
  'export const input = import("desert/programa");',
  'import constructors = require("desert/programa"); export const input = constructors;',
])("rejects acquisition of house constructors through shared code: %s", code => {
  const repo = devicePackage();
  writeFileSync(join(repo.root, "src/input.ts"), code);
  expect(programImports(repo)).toContain("device/index.ts → ../src/input.ts");
});

it.each([
  ["src/bad.ts", "toy/device"],
  ["device/bad.ts", "toy"],
])("keeps package aliases across the device boundary closed: %s", (file, specifier) => {
  const repo = devicePackage();
  const manifest = join(repo.root, "package.json");
  writeFileSync(
    manifest,
    readFileSync(manifest, "utf8").replace(
      '"device":["device"]',
      `"device":["device"],"dependencies":[{"kind":"contract","name":"${specifier}"}]`,
    ),
  );
  writeFileSync(join(repo.root, file), `import "${specifier}";`);
  expect(programImports(repo)).toContain(`${file} → ${specifier}`);
});
