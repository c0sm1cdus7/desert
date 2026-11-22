// Builds a standalone program whose house catalog and separately exported executor share only schemas and texts.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { installablePackage } from "./installable-package.ts";
import { lawOptions, lawPackage } from "./law-repository.ts";
export function devicePackage() {
  const repo = installablePackage();
  const code = ["src", "device"];
  mkdirSync(join(repo.root, "device"));
  declareDevice(repo.root);
  deviceModules(repo.root);
  deviceAction(repo.root);
  deviceChecks(repo.root);
  return { ...repo, code };
}
function declareDevice(root: string) {
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      ...lawPackage,
      name: "toy",
      exports: { ".": "./src/program.ts", "./device": "./device/index.ts" },
      peerDependencies: { desert: "0.1.0" },
      desert: {
        program: "src/program.ts",
        testDistribution: "tests/distribution.ts",
        device: ["device"],
        laws: {
          ...lawOptions,
          code: ["src", "device"],
          base: "desert",
          catalog: ["src/texts.ts"],
          adapters: ["device"],
          adapterUsers: { "device/": "Only the device executor uses local infrastructure." },
          mayTalkOutside: { "device/": "The device executor owns local I/O." },
        },
      },
    }),
  );
}
function deviceModules(root: string) {
  writeFileSync(
    join(root, "src/input.ts"),
    `// Shares a public schema with the executor.
import { Type } from "desert/program";
export const input = Type.Object({});
`,
  );
  writeFileSync(
    join(root, "device/index.ts"),
    `// Runs the declared action on its device.
import { basename } from "node:path";
import type { InstalledDeviceTool } from "desert/doors/device-process";
import { input } from "../src/input.ts";
import { saved } from "../src/texts.ts";
export const executor: InstalledDeviceTool = { tool: "toy", version: "1", actions: {
  "notes/add": async () => ({ status: "accepted", reference: basename(saved), value: input.type }) } };
`,
  );
}
function deviceAction(root: string) {
  const notes = join(root, "src/notes.ts");
  writeFileSync(
    notes,
    readFileSync(notes, "utf8")
      .replace("const input = Type.Object({});", 'import { input } from "./input.ts";')
      .replace(
        "undoable: true, input,",
        'undoable: true, input, execution: { at: "device", tool: "toy", version: "1" },',
      )
      .replace(
        "promise, input: {}, then: { says: saved, facts: [] }",
        `promise, input: {},
      given: [{ device: { id: "mac", owner: "ana", tool: "toy", version: "1",
        actions: ["notes/add"], result: "toy" } }],
      destination: { kind: "device", device: "mac" }, then: { says: saved, facts: [] }`,
      ),
  );
  const texts = join(root, "src/texts.ts");
  writeFileSync(texts, readFileSync(texts, "utf8").replace("Anotada · Nota", "Terminada · Ejecución · toy"));
  const distribution = join(root, "tests/distribution.ts");
  writeFileSync(distribution, readFileSync(distribution, "utf8").replace("identities: false", "identities: true"));
}

function deviceChecks(root: string): void {
  const lint = join(root, "eslint.config.js");
  writeFileSync(
    lint,
    readFileSync(lint, "utf8").replace(
      ".default;",
      `.default.map(entry =>
    entry.files?.includes("src/**/*.ts") ? { ...entry, files: [...entry.files, "device/**/*.ts"] } : entry);`,
    ),
  );
  const vitest = join(root, "vitest.config.ts");
  writeFileSync(
    vitest,
    readFileSync(vitest, "utf8").replace('"src/**/*.spec.ts",', '"src/**/*.spec.ts", "device/**/*.spec.ts",'),
  );
  const compiler = join(root, "tsconfig.json");
  writeFileSync(compiler, readFileSync(compiler, "utf8").replace('"src/**/*.ts",', '"src/**/*.ts","device/**/*.ts",'));
}
