import { ESLint } from "eslint";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { programPartCount } from "../program/parts.ts";
import { field as fieldOf } from "../contract/json.ts";
import vitestConfig from "../../vitest.config.ts";
import { filesUnder, fromRoot, isSpec, parsed, root, src } from "../support/sources.ts";

const eslint = new ESLint({ cwd: root });
const linted = [...filesUnder(src), ...filesUnder(join(root, "tests")), join(root, "vitest.config.ts")];

type Limit = (options: unknown, file: string) => boolean;
const atMost =
  (key: string, max: (file: string) => number): Limit =>
  (options, file) =>
    Number(fieldOf(options, key)) <= max(file);
const anyOptions: Limit = () => true;

/** The rules the gate stands on, each at error and no looser than its limit, for every file it lints. */
const required: Readonly<Record<string, Limit>> = {
  "max-lines": atMost("max", () => 200),
  "max-len": atMost("code", () => 120),
  "max-statements-per-line": atMost("max", () => 1),
  "max-depth": options => typeof options === "number" && options <= 3,
  "max-lines-per-function": atMost("max", file => (isSpec(file) ? 120 : 40)),
  "no-nested-ternary": anyOptions,
  "@typescript-eslint/consistent-type-assertions": options => fieldOf(options, "assertionStyle") === "never",
  "@typescript-eslint/ban-ts-comment": anyOptions,
  "@typescript-eslint/no-explicit-any": anyOptions,
  "@typescript-eslint/no-unsafe-argument": anyOptions,
  "@typescript-eslint/no-non-null-assertion": anyOptions,
  "@typescript-eslint/switch-exhaustiveness-check": anyOptions,
};

const looseRulesOf = async (file: string): Promise<string[]> => {
  const config: unknown = await eslint.calculateConfigForFile(file);
  const inline = fieldOf(fieldOf(config, "linterOptions"), "noInlineConfig") === true ? [] : ["inline configuration"];
  const loose = Object.entries(required).filter(([rule, limit]) => {
    const setting = fieldOf(fieldOf(config, "rules"), rule);
    const entries: readonly unknown[] = Array.isArray(setting) ? setting : [];
    const [severity, options] = entries;
    return severity !== 2 || !limit(options, file);
  });
  return [...inline, ...loose.map(([rule]) => rule)].map(rule => `${fromRoot(file)}: ${rule}`);
};

const isLaw = (path: string): boolean => path.startsWith("tests/laws/") && path.endsWith(".spec.ts");

const runners = ["it", "test", "describe", "suite", "bench"];
const escapes = ["only", "skip", "todo", "skipIf", "runIf", "fails"];

/** Every `it.only`, `describe.skip`, `test.todo`…: a test the gate would not run. */
const escapesIn = (source: ts.SourceFile): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    const runner = ts.isPropertyAccessExpression(node) ? node.expression.getText().split(".")[0] : undefined;
    if (runner && runners.includes(runner) && escapes.includes(node.getChildAt(2).getText())) {
      found.push(node.getText());
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

describe("law 12: a gate that cannot be cheated", () => {
  it("lints every file of src and tests, and ignores none of them", async () => {
    const ignored = await Promise.all(linted.map(async file => ((await eslint.isPathIgnored(file)) ? [file] : [])));
    expect(ignored.flat().map(fromRoot)).toEqual([]);
  });

  it("holds every rule it stands on at error, no looser than its limit, and refuses inline configuration", async () => {
    const loose = await Promise.all(linted.map(looseRulesOf));
    expect(loose.flat()).toEqual([]);
  });

  it("runs every check, with the linter over everything and no warning allowed", () => {
    const scripts = fieldOf(JSON.parse(readFileSync(join(root, "package.json"), "utf8")), "scripts");
    expect(fieldOf(scripts, "gate")).toBe("pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm laws");
    expect(fieldOf(scripts, "lint")).toBe("eslint --max-warnings 0 .");
  });

  it("is a private package that runs TypeScript without a loader", () => {
    const pkg: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(fieldOf(pkg, "name")).toBe("desert");
    expect(fieldOf(pkg, "private")).toBe(true);
    expect(fieldOf(pkg, "engines")).toEqual({ node: ">=24" });
  });

  it("limits the relocation bridge to test support inside this worktree", () => {
    const config: unknown = JSON.parse(readFileSync(join(root, "tsconfig.json"), "utf8"));
    expect(fieldOf(fieldOf(config, "compilerOptions"), "rootDirs")).toEqual(["tests/support", "../tests/support"]);
  });

  it("collects every spec in the gate", () => {
    const projects = fieldOf(fieldOf(vitestConfig, "test"), "projects");
    const includes = Array.isArray(projects)
      ? projects.map(project => fieldOf(fieldOf(project, "test"), "include"))
      : [];
    /** What the program of this repository promises runs with the specs: no gate leaves the derived checks out. */
    expect(includes).toEqual([["src/**/*.spec.ts", "tests/program/**/*.checks.ts"], ["tests/laws/**/*.spec.ts"]]);
    const said: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(typeof fieldOf(fieldOf(said, "desert"), "program")).toBe("string");
    const tests = filesUnder(root, path => /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(path)).map(fromRoot);
    expect(tests.filter(path => !(path.startsWith("src/") && path.endsWith(".spec.ts")) && !isLaw(path))).toEqual([]);
  });

  it("keeps every program part on disk exactly once, with its own index", () => {
    const files = filesUnder(join(root, "tests/program"), path => path.endsWith(".checks.ts")).sort(
      (a, b) => Number(a.match(/part-(\d+)/)?.[1]) - Number(b.match(/part-(\d+)/)?.[1]),
    );
    const expected = Array.from({ length: programPartCount }, (_, part) => `tests/program/part-${part}.checks.ts`);
    expect(files.map(fromRoot)).toEqual(expected);
    files.forEach((file, part) => {
      expect(readFileSync(file, "utf8").trim()).toBe(
        `import { runProgramPart } from "./run.ts";\n\nawait runProgramPart(${part});`,
      );
    });
  });

  it("skips no test and focuses on none", () => {
    expect(linted.flatMap(file => escapesIn(parsed(file)).map(found => `${fromRoot(file)}: ${found}`))).toEqual([]);
  });

  it("finds a skipped, a focused and an unfinished test", () => {
    const code = [
      'it.only("a", f); describe.skip("b", f); it.each(cases).skip;',
      'test.todo("c"); it.fails("unknown", f); it("d", f); x.skip;',
    ].join(" ");
    const source = ts.createSourceFile("s.ts", code, ts.ScriptTarget.Latest, true);
    expect(escapesIn(source)).toEqual(["it.only", "describe.skip", "it.each(cases).skip", "test.todo", "it.fails"]);
  });
});
