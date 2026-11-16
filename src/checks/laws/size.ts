// Laws 11 and 12: readable files, strict types and checks that remain on.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { field } from "../../fields/json-values.ts";
import { checkedFiles, codeFiles, fromRoot, isSpec, parsed, type Repository } from "./law-files.ts";
const linesOf = (file: string): string[] => readFileSync(file, "utf8").replace(/\n$/, "").split("\n");

/** Every unsafe assertion in a file: `as` other than `as const`, `<T>value`, and the non-null `value!`. */
const castsOf = (repo: Repository, file: string): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    const isConst = ts.isAsExpression(node) && ts.isTypeReferenceNode(node.type) && node.type.getText() === "const";
    if ((ts.isAsExpression(node) && !isConst) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node)) {
      found.push(`${fromRoot(repo.root, file)}: ${node.getText()}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed(file));
  return found;
};

export function longFiles(repo: Repository, max: number): string[] {
  return checkedFiles(repo)
    .filter(file => linesOf(file).length > max)
    .map(file => fromRoot(repo.root, file));
}
export function repeatedClasses(repo: Repository): string[] {
  const classes = codeFiles(repo)
    .filter(file => !isSpec(file))
    .flatMap(file =>
      parsed(file).statements.flatMap(statement =>
        ts.isClassDeclaration(statement) && statement.name ? [statement.name.text] : [],
      ),
    );
  return classes.filter((name, index) => classes.indexOf(name) !== index);
}
export function longLines(repo: Repository): string[] {
  return checkedFiles(repo).flatMap(file =>
    linesOf(file).flatMap((line, index) => (line.length > 120 ? [`${fromRoot(repo.root, file)}:${index + 1}`] : [])),
  );
}
export function unsafeCasts(repo: Repository): string[] {
  return checkedFiles(repo)
    .filter(file => file.endsWith(".ts"))
    .flatMap(file => castsOf(repo, file));
}
export function switchedOffChecks(repo: Repository): string[] {
  const halves = [
    ["eslint", "disable"],
    ["eslint", "enable"],
    ["@ts", "ignore"],
    ["@ts", "nocheck"],
    ["@ts", "expect-error"],
    ["prettier", "ignore"],
  ];
  const escapes = halves.map(parts => parts.join("-"));
  return checkedFiles(repo)
    .filter(file => escapes.some(escape => readFileSync(file, "utf8").includes(escape)))
    .map(file => fromRoot(repo.root, file));
}
export function looseCompiler(repo: Repository): string[] {
  codeFiles(repo);
  const config: unknown = ts.parseConfigFileTextToJson(
    "tsconfig.json",
    readFileSync(join(repo.root, "tsconfig.json"), "utf8"),
  ).config;
  return ["strict", "erasableSyntaxOnly", "noUncheckedIndexedAccess", "exactOptionalPropertyTypes"].filter(
    key => field(field(config, "compilerOptions"), key) !== true,
  );
}
