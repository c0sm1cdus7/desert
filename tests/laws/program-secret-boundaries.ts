import { existsSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import ts from "typescript";
import { filesUnder, root as base } from "../support/sources.ts";
import { field } from "../contract/json.ts";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
import { secretPublicApi } from "./secret-public-api.ts";
const inside = (directory: string, file: string): boolean => file.startsWith(`${directory}${sep}`);
const production = (directory: string): string[] => filesUnder(directory).filter(file => !file.endsWith(".spec.ts"));
function aliasesAt(root: string): Readonly<Record<string, string>> {
  const config = join(root, "tsconfig.json");
  if (!existsSync(config)) return {};
  const result = ts.readConfigFile(config, path => readFileSync(path, "utf8"));
  const options = ts.parseJsonConfigFileContent(result.config, ts.sys, root).options;
  return Object.fromEntries(
    Object.entries(options.paths ?? {}).flatMap(([name, paths]) => {
      const path = paths[0];
      return path ? [[name, resolve(root, path)]] : [];
    }),
  );
}
/** Every program gate includes this check; exemptions never include a tool declaration. */
export function programSecretBoundaries(root: string): string[] {
  const pkg: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const entry = field(field(pkg, "desert"), "program");
  if (typeof entry !== "string") return ["missing desert.program"];
  const main = resolve(root, entry);
  const files =
    root === base
      ? [main, join(base, "tests/support/shop.ts"), join(base, "tests/support/shop-folds.ts")]
      : [...new Set([main, ...production(join(root, "src"))])];
  const sources = Object.fromEntries(
    [...new Set([...production(join(base, "src")), ...files])].map(file => [file, readFileSync(file, "utf8")]),
  );
  const adapters = files.filter(file => inside(join(root, "src/adapters"), file));
  const publicModules = secretPublicApi(base);
  const custody = production(join(base, "src/adapters"));
  const tools = files.filter(file => file !== main && !adapters.includes(file));
  const overlap = [...adapters, main].filter(file => declaresTool(sources[file] ?? "", file));
  return [
    ...overlap.map(file => `${file}: separate tool declarations from composition and adapters`),
    ...secretBoundaryViolations(sources, {
      composition: [main, ...production(join(base, "src/programs"))],
      adapters,
      custody: [...custody, ...Object.keys(sources).filter(file => inside(join(base, "src"), file))],
      publicTypes: [],
      publicModules,
      tools,
      aliases: aliasesAt(root),
    }),
  ];
}
function declaresTool(code: string, file: string): boolean {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const names = node.properties.flatMap(property => (property.name ? [propertyName(property.name)] : []));
      found ||= names.includes("acts") || names.includes("run");
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function propertyName(name: ts.PropertyName): string {
  return ts.isStringLiteralLike(name) || ts.isIdentifier(name) ? name.text : name.getText();
}
