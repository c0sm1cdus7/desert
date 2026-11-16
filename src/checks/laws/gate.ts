// Law 12: the repository gate covers every test and keeps its lint rules at their limits.
import { ESLint } from "eslint";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { field } from "../../fields/json-values.ts";
import { codeFiles, filesUnder, fromRoot, lintFiles, isSpec, parsed, type Repository } from "./law-files.ts";

export type LintReading = Readonly<{ file: string; ignored: boolean; config: unknown }>;
/** ESLint reads asynchronously; the laws below inspect that complete reading synchronously. */
export async function readLint(repo: Repository): Promise<readonly LintReading[]> {
  const eslint = new ESLint({ cwd: repo.root });
  return Promise.all(
    lintFiles(repo).map(async file => {
      const config: unknown = await eslint.calculateConfigForFile(file);
      return {
        file,
        ignored: await eslint.isPathIgnored(file),
        config,
      };
    }),
  );
}
type Limit = (options: unknown, file: string) => boolean;
const atMost =
  (key: string, max: (file: string) => number): Limit =>
  (options, file) =>
    Number(field(options, key)) <= max(file);
const anyOptions: Limit = () => true;

/** The rules the gate stands on, each at error and no looser than its limit, for every file it lints. */
const required: Readonly<Record<string, Limit>> = {
  "max-len": atMost("code", () => 120),
  "max-statements-per-line": atMost("max", () => 1),
  "max-depth": options => typeof options === "number" && options <= 3,
  "max-lines-per-function": atMost("max", file => (isSpec(file) ? 120 : 40)),
  "no-nested-ternary": anyOptions,
  "@typescript-eslint/consistent-type-assertions": options => field(options, "assertionStyle") === "never",
  "@typescript-eslint/ban-ts-comment": anyOptions,
  "@typescript-eslint/no-explicit-any": anyOptions,
  "@typescript-eslint/no-unsafe-argument": anyOptions,
  "@typescript-eslint/no-non-null-assertion": anyOptions,
  "@typescript-eslint/switch-exhaustiveness-check": anyOptions,
};

export function ignoredFiles(repo: Repository, readings: readonly LintReading[]): string[] {
  return lintFiles(repo)
    .filter(file => !readings.some(entry => entry.file === file && !entry.ignored))
    .map(file => fromRoot(repo.root, file));
}
const looseRulesOf = (repo: Repository, entry: LintReading, max: number | null): string[] => {
  const { file, config } = entry;
  const inline = field(field(config, "linterOptions"), "noInlineConfig") === true ? [] : ["inline configuration"];
  const rules = max === null ? required : { ...required, "max-lines": atMost("max", () => max) };
  const loose = Object.entries(rules).filter(([rule, limit]) => {
    const setting = field(field(config, "rules"), rule);
    const entries: readonly unknown[] = Array.isArray(setting) ? setting : [];
    const [severity, options] = entries;
    return severity !== 2 || !limit(options, file);
  });
  return [...inline, ...loose.map(([rule]) => rule)].map(rule => `${fromRoot(repo.root, file)}: ${rule}`);
};
export function looseRules(
  repo: Repository,
  options: Readonly<{
    readings: readonly LintReading[];
    maxLines: number | null;
  }>,
): string[] {
  return lintFiles(repo).flatMap(file =>
    looseRulesOf(
      repo,
      options.readings.find(entry => entry.file === file) ?? { file, ignored: true, config: undefined },
      options.maxLines,
    ),
  );
}

const packageOf = (repo: Repository): unknown => JSON.parse(readFileSync(join(repo.root, "package.json"), "utf8"));
export function gateScripts(repo: Repository): string[] {
  codeFiles(repo);
  const scripts = field(packageOf(repo), "scripts");
  const expected = {
    gate: "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm laws",
    lint: "eslint --max-warnings 0 .",
  };
  return Object.entries(expected)
    .filter(([key, value]) => field(scripts, key) !== value)
    .map(([key]) => key);
}
export function packageShape(repo: Repository, name: string): string[] {
  codeFiles(repo);
  const pkg = packageOf(repo);
  const engines = field(pkg, "engines");
  const node = field(engines, "node");
  return [
    field(pkg, "name") === name ? [] : ["name"],
    field(pkg, "private") === true ? [] : ["private"],
    node === ">=24" && typeof engines === "object" && engines !== null && Object.keys(engines).length === 1
      ? []
      : ["engines"],
  ].flat();
}

const runners = ["it", "test", "describe", "suite", "bench"];
const escapes = ["only", "skip", "todo", "skipIf", "runIf", "fails"];

/** Every `it.only`, `describe.skip`, `test.todo`…: a test the gate would not run. */
export const escapesIn = (source: ts.SourceFile): string[] => {
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

export function skippedTests(repo: Repository): string[] {
  return lintFiles(repo).flatMap(file =>
    escapesIn(parsed(file)).map(found => `${fromRoot(repo.root, file)}: ${found}`),
  );
}
export function strayTests(repo: Repository, options: Readonly<{ base: string | null }>): string[] {
  codeFiles(repo);
  const tests = filesUnder(repo.root, path => /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(path)).map(file =>
    fromRoot(repo.root, file),
  );
  return tests.filter(
    path =>
      !(repo.code.some(folder => path.startsWith(`${folder}/`)) && path.endsWith(".spec.ts")) &&
      !(path.startsWith("tests/laws/") && path.endsWith(".spec.ts")) &&
      !(options.base !== null && path.startsWith(`${options.base}/`)),
  );
}

const propertyOf = (node: ts.Node | undefined, key: string): ts.Expression | undefined => {
  if (!node || !ts.isObjectLiteralExpression(node)) return undefined;
  const property = node.properties.find(
    entry =>
      ts.isPropertyAssignment(entry) &&
      (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) &&
      entry.name.text === key,
  );
  return property && ts.isPropertyAssignment(property) ? property.initializer : undefined;
};
const projectIncludes = (source: ts.SourceFile): (string[] | undefined)[] => {
  const statement = source.statements.find(ts.isExportAssignment);
  const expression = statement?.expression;
  const config =
    expression && ts.isCallExpression(expression) && expression.expression.getText() === "defineConfig"
      ? expression.arguments[0]
      : expression;
  const projects = propertyOf(propertyOf(config, "test"), "projects");
  if (!projects || !ts.isArrayLiteralExpression(projects)) return [];
  return projects.elements.map(project => {
    const include = propertyOf(propertyOf(project, "test"), "include");
    return include && ts.isArrayLiteralExpression(include)
      ? include.elements.map(element => (ts.isStringLiteral(element) ? element.text : "<dynamic>"))
      : undefined;
  });
};
/** Literal project includes keep each code folder and the base's derived checks in the gate. */
export function uncollectedTests(repo: Repository, options: Readonly<{ base: string | null }>): string[] {
  codeFiles(repo);
  const includes = projectIncludes(parsed(join(repo.root, "vitest.config.ts")));
  const prefix = options.base === null ? "" : `${options.base}/`;
  const expected = [
    [...repo.code.map(folder => `${folder}/**/*.spec.ts`), `${prefix}tests/program/**/*.checks.ts`],
    ["tests/laws/**/*.spec.ts"],
  ];
  const collection = JSON.stringify(includes) === JSON.stringify(expected) ? [] : ["vitest.config.ts: include"];
  const program = field(field(packageOf(repo), "desert"), "program");
  return [...collection, ...(typeof program === "string" ? [] : ["package.json: desert.program"])];
}
