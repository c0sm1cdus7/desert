import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { installablePackage } from "../support/installable-package.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";
import { loadProgram } from "../program/load.ts";

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
