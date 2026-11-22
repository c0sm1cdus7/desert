import ts from "typescript";
import { expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { projectionVersion } from "../projection-version.ts";
import { compose } from "./compose.ts";
import { sampleOptions } from "../../../tests/support/installable-program.ts";
it("loads linked TypeScript packages outside node_modules with one DESERT instance", () => {
  const home = mkdtempSync(join(tmpdir(), "desert-installable-"));
  try {
    const toy = join(home, "packages", "toy");
    mkdirSync(join(toy, "node_modules"), { recursive: true });
    mkdirSync(join(home, "node_modules"));
    symlinkSync(resolve("."), join(home, "node_modules", "desert"), "dir");
    symlinkSync(resolve("."), join(toy, "node_modules", "desert"), "dir");
    symlinkSync(toy, join(home, "node_modules", "toy"), "dir");
    writeFileSync(join(home, "package.json"), JSON.stringify({ type: "module" }));
    writeFileSync(
      join(toy, "package.json"),
      JSON.stringify({ name: "toy", type: "module", exports: "./index.ts", peerDependencies: { desert: "0.1.0" } }),
    );
    writeFileSync(
      join(toy, "index.ts"),
      `
import { defineProgram, DESERT_CONTRACT, Type } from "desert/program";
import { defineMessage } from "desert/messages";
import { OutsideDefect } from "desert/fields/program-call";
export const problem = new OutsideDefect("fixture");
export const toy = defineProgram({ id: "toy", version: "1.0.0", desert: DESERT_CONTRACT,
  code: [import.meta.filename], facts: [], initial: () => 0 }, {
  purpose: "contar", words: { name: "Juguete", key: "j", itself: [] }, tools: {},
  skill: defineMessage({ id: "toy.skill", kind: "skill", parameters: Type.Object({}),
    texts: { es: "Contá con tus acciones." } }), fold: value => value, summary: () => "Juguete"
});
`,
    );
    writeFileSync(
      join(home, "index.ts"),
      `
import { toy, problem } from "toy";
import { compose } from "desert/compose";
import { OutsideDefect } from "desert/fields/program-call";
import { startHouse } from "desert/runtime";
import { programChecks } from "desert/testing";
const result = compose({ programs: [toy], identities: true,
 minds: { assistants: false, programs: [] }, shown: { code: [import.meta.filename],
 locale: { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" } } });
process.stdout.write(JSON.stringify({ same: problem instanceof OutsideDefect,
 ids: result.program.registry.map(p => p.id), start: typeof startHouse, checks: typeof programChecks }));
`,
    );
    const typed = ts.createProgram([join(home, "index.ts")], {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      allowImportingTsExtensions: true,
      exactOptionalPropertyTypes: true,
      types: ["node"],
      typeRoots: [resolve("node_modules/@types")],
    });
    expect(ts.getPreEmitDiagnostics(typed).map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n"))).toEqual([]);
    const output = execFileSync(process.execPath, [join(home, "index.ts")], { encoding: "utf8" });
    expect(JSON.parse(output)).toEqual({ same: true, ids: ["toy"], start: "function", checks: "function" });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}, 30000);
it.each(["program", "presentation"])("pins %s code until a new process composes the distribution", changed => {
  const home = mkdtempSync(join(tmpdir(), "desert-code-"));
  try {
    const code = join(home, "fold.ts");
    const presentation = join(home, "presentation.ts");
    writeFileSync(code, "export const fold = 1;\n");
    writeFileSync(presentation, "export const title = 1;\n");
    const paths = { code, presentation };
    const options = {
      ...sampleOptions,
      programs: [{ ...sampleOptions.programs[0], code: [code] }],
      shown: { ...sampleOptions.shown, code: [presentation] },
    } as const;
    const first = compose(options);
    const previous = projectionVersion([changed === "program" ? code : presentation]);
    writeFileSync(changed === "program" ? code : presentation, "export const changed = 2;\n");
    expect(projectionVersion([changed === "program" ? code : presentation])).not.toBe(previous);
    const second = compose(options);
    expect(second.calculation.value).toBe(first.calculation.value);
    expect(second.manifest).toEqual(first.manifest);
    const fixture = new URL("../../../tests/support/installable-program.ts", import.meta.url).href;
    const script = `
import { compose } from ${JSON.stringify(new URL("./compose.ts", import.meta.url).href)};
import { sampleOptions } from ${JSON.stringify(fixture)};
const paths = ${JSON.stringify(paths)};
const result = compose({ ...sampleOptions,
  programs: [{ ...sampleOptions.programs[0], code: [paths.code] }],
  shown: { ...sampleOptions.shown, code: [paths.presentation] } });
process.stdout.write(JSON.stringify({ calculation: result.calculation.value, manifest: result.manifest }));`;
    const next: unknown = JSON.parse(
      execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" }),
    );
    expect(next).toEqual({
      calculation: projectionVersion(first.calculation.trees),
      manifest: {
        ...first.manifest,
        programs: first.manifest.programs.map(p => ({ ...p, calculation: projectionVersion([code]) })),
      },
    });
    expect(next).not.toEqual({ calculation: first.calculation.value, manifest: first.manifest });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
