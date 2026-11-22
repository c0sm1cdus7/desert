// A distribution's entries: the host and door entries stay out of a program's reach and its secret API, every one.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { installablePackage } from "../support/installable-package.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";
import { loadProgram } from "../program/load.ts";
import { programLaws } from "../../src/checks/laws/program-laws.ts";
import { field, isRecord } from "../../src/fields/json-values.ts";

function legacy(root: string): void {
  const path = join(root, "package.json");
  const pkg: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(pkg)) throw new Error("missing package");
  const desert = field(pkg, "desert");
  if (!desert || typeof desert !== "object") throw new Error("missing desert");
  const entries = Object.entries(desert).filter(([key]) => key !== "testDistribution" && key !== "program");
  writeFileSync(
    path,
    JSON.stringify({ ...pkg, desert: { ...Object.fromEntries(entries), program: "tests/distribution.ts" } }),
  );
}

for (const [entry, name] of [
  ["surface/house-router", "houseRouter"],
  ["runtime/cloud", "startCloudHouse"],
  ["doors/keys", "environmentDoorKeys"],
  ["doors/mcp/handler", "mcpDoor"],
] as const) {
  it(`keeps desert/${entry} outside the audited program secret API`, () => {
    const repo = installablePackage();
    const path = join(repo.root, "src/notes.ts");
    writeFileSync(path, `import { ${name} } from "desert/${entry}";\n${readFileSync(path, "utf8")}`);
    expect(programSecretBoundaries(repo.root).some(reason => reason.includes(`desert/${entry}`))).toBe(true);
  });
  it(`rejects desert/${entry} before evaluating an installed program`, async () => {
    const repo = installablePackage();
    writeFileSync(
      join(repo.root, "src/program.ts"),
      `import { ${name} } from "desert/${entry}"; throw new Error("evaluated");`,
    );
    await expect(loadProgram(repo.root)).rejects.toThrow(`src/program.ts → desert/${entry}`);
  });
}

for (const testDistribution of [false, true]) {
  it(`rejects the four Notas reexports through the package laws, testDistribution=${testDistribution}`, async () => {
    const repo = installablePackage();
    if (!testDistribution) legacy(repo.root);
    const path = join(repo.root, "src/program.ts");
    const entries = [
      ["surface/house-router", "houseRouter"],
      ["runtime/cloud", "startCloudHouse"],
      ["doors/keys", "environmentDoorKeys"],
      ["doors/mcp/handler", "mcpDoor"],
    ];
    writeFileSync(
      path,
      readFileSync(path, "utf8") +
        entries.map(([entry, name]) => `export { ${name} } from "desert/${entry}";`).join("\n"),
    );
    const found = await programLaws(repo.root);
    for (const [entry] of entries) expect(found).toContain(`src/program.ts → desert/${entry}`);
    await expect(loadProgram(repo.root)).rejects.toThrow("src/program.ts → desert/");
  });
  it(`rejects before evaluating either entry, testDistribution=${testDistribution}`, async () => {
    const repo = installablePackage();
    if (!testDistribution) legacy(repo.root);
    const marker = join(repo.root, "evaluated");
    writeFileSync(
      join(repo.root, "tests/distribution.ts"),
      `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "evaluated");`,
    );
    writeFileSync(join(repo.root, "src/program.ts"), 'export * from "desert/runtime/cloud";');
    await expect(loadProgram(repo.root)).rejects.toThrow("src/program.ts → desert/runtime/cloud");
    expect(existsSync(marker)).toBe(false);
  });
}
it("rejects a secret capability through an otherwise allowed entry before evaluation", async () => {
  const repo = installablePackage();
  const marker = join(repo.root, "evaluated");
  const path = join(repo.root, "src/notes.ts");
  writeFileSync(path, 'import { SecretResolver } from "desert/testing";\n' + readFileSync(path, "utf8"));
  writeFileSync(
    join(repo.root, "tests/distribution.ts"),
    `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "evaluated");`,
  );
  await expect(loadProgram(repo.root)).rejects.toThrow("desert/testing");
  expect(existsSync(marker)).toBe(false);
});
it("does not silently bypass the secret boundary without testDistribution", () => {
  const repo = installablePackage();
  legacy(repo.root);
  expect(programSecretBoundaries(repo.root).some(reason => reason.includes("desert.testDistribution"))).toBe(true);
});

for (const testDistribution of [false, true])
  for (const entry of [
    "surface/house-router",
    "surface/contract",
    "runtime/cloud",
    "doors/keys",
    "doors/mcp/handler",
    "runtime",
    "componer",
    "doors/terminal",
    "doors/socket",
    "doors/mcp",
    "calculation",
    "doors/screen",
    "doors/screen/wire",
  ])
    it.each([
      `import "desert/${entry}";`,
      `export * from "desert/${entry}";`,
      `type Host = import("desert/${entry}").Host;`,
      `const host = import("desert/${entry}");`,
      `const host = require("desert/${entry}");`,
    ])(`keeps the secret law active, testDistribution=${testDistribution}: %s`, code => {
      const repo = installablePackage();
      if (!testDistribution) legacy(repo.root);
      writeFileSync(join(repo.root, "src/program.ts"), code);
      expect(programSecretBoundaries(repo.root)).toContain(`src/program.ts → desert/${entry}`);
    });

it("allows a declared distribution to load and reexport all four host entries", async () => {
  const repo = installablePackage();
  const path = join(repo.root, "package.json");
  const pkg: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(pkg)) throw new Error("missing package");
  writeFileSync(
    path,
    JSON.stringify({
      ...pkg,
      desert: {
        kind: "distribution",
        program: "src/host.ts",
        laws: field(field(pkg, "desert"), "laws"),
      },
    }),
  );
  writeFileSync(
    join(repo.root, "src/host.ts"),
    `
export { houseRouter } from "desert/surface/house-router";
export { startCloudHouse } from "desert/runtime/cloud";
export { environmentDoorKeys } from "desert/doors/keys";
export { mcpDoor } from "desert/doors/mcp/handler";
export const program = { registry: [], slices: {}, words: {} };
export const shown = { words: {}, locale: {} };
`,
  );
  expect(programSecretBoundaries(repo.root)).toEqual([]);
  expect((await loadProgram(repo.root)).where).toBe("src/host.ts");
});

it("preserves the terminal timing contract while adding the remote entry", async () => {
  const terminal = await import("../../src/doors/terminal/public-terminal.ts");
  const existing = await import("../../src/doors/terminal/boot.ts");
  expect(terminal.startTerminal).toBe(existing.startTerminal);
  expect(terminal.keyWaits).toBe(existing.keyWaits);
  expect(typeof terminal.openProgramTerminal).toBe("function");
});
