import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";
import { installablePackage } from "../support/installable-package.ts";
import { filesUnder, root } from "../support/sources.ts";

// Copy only code and the package manifest; never copy local credentials, data or repository metadata.
function copiedBase(target: string): void {
  for (const folder of ["src", "tests"]) {
    for (const file of filesUnder(join(root, folder))) {
      const destination = join(target, relative(root, file));
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(file, destination);
    }
  }
  copyFileSync(join(root, "package.json"), join(target, "package.json"));
  symlinkSync(join(root, "node_modules"), join(target, "node_modules"), "dir");
}
function inspectLoad(base: string, consumer: string): string {
  const url = pathToFileURL(join(base, "tests/program/load.ts")).href;
  const code = `import { loadProgram } from ${JSON.stringify(url)};
    try { const loaded = await loadProgram(${JSON.stringify(consumer)});
      console.log(JSON.stringify({ loaded: loaded.program.registry.map(tool => tool.id) }));
    } catch (error) { console.log(JSON.stringify({ rejected: error.message })); }`;
  return execFileSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8",
    timeout: 30000,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const hostModule = "../surface/bridge/assembly/house-router.ts";
const imported = `import { houseRouter } from "${hostModule}";`;
const cases = {
  direct: `export { houseRouter as shownMoney } from "${hostModule}";`,
  variable: `${imported} export const shownMoney = houseRouter;`,
  parenthesized: `${imported} export const shownMoney = (houseRouter);`,
  satisfies: `${imported} export const shownMoney = houseRouter satisfies typeof houseRouter;`,
  typed: `${imported} export const shownMoney = houseRouter as typeof houseRouter;`,
  default: `${imported} export default houseRouter; export { default as shownMoney } from "./fields.ts";`,
  object: `${imported} export const shownMoney = { houseRouter };`,
  destructured: `import * as host from "${hostModule}"; export const { houseRouter: shownMoney } = host;`,
  namespace: `export * as shownMoney from "${hostModule}";`,
  wrapper: `${imported} export const shownMoney = () => houseRouter();`,
};
it.each(Object.entries(cases))(
  "rejects the auditor's %s form before either consumer entry executes",
  (name, mutation) => {
    const repo = installablePackage();
    const base = join(repo.root, "base");
    copiedBase(base);
    for (const link of ["desert", "node_modules/desert"]) {
      unlinkSync(join(repo.root, link));
      symlinkSync(base, join(repo.root, link), "dir");
    }
    // The same physical kernel composes and loads a valid program before the real satisfies mutation.
    if (name === "satisfies") expect(inspectLoad(base, repo.root)).toContain('"loaded":["toy"]');
    const fields = join(base, "src/fields/fields.ts");
    writeFileSync(
      fields,
      readFileSync(fields, "utf8").replace(
        'export { money, shownMoney } from "./money-field.ts";',
        'export { money } from "./money-field.ts";',
      ) + `\n${mutation}`,
    );
    const principal = join(repo.root, "src/program.ts");
    writeFileSync(
      principal,
      readFileSync(principal, "utf8") +
        '\nexport { shownMoney as host } from "desert/fields";\nthrow new Error("evaluated principal");',
    );
    writeFileSync(join(repo.root, "tests/distribution.ts"), 'throw new Error("evaluated distribution");');
    const result = inspectLoad(base, repo.root);
    expect(result).toContain('"rejected":');
    expect(result).toContain("desert/fields → shownMoney");
    expect(result).toContain("surface/bridge/assembly/house-router.ts:houseRouter");
    expect(result).not.toContain("evaluated principal");
    expect(result).not.toContain("evaluated distribution");
  },
  60000,
);
