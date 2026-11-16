import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { field as fieldOf } from "../contract/json.ts";
import { filesUnder, fromRoot, parsed, root, sourceFiles, src } from "../support/sources.ts";

const code = [
  ...filesUnder(src),
  ...filesUnder(join(root, "tests")),
  join(root, "vitest.config.ts"),
  join(root, "eslint.config.js"),
];
const linesOf = (file: string): string[] => readFileSync(file, "utf8").replace(/\n$/, "").split("\n");

/** Every unsafe assertion in a file: `as` other than `as const`, `<T>value`, and the non-null `value!`. */
const castsOf = (file: string): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    const isConst = ts.isAsExpression(node) && ts.isTypeReferenceNode(node.type) && node.type.getText() === "const";
    if ((ts.isAsExpression(node) && !isConst) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node)) {
      found.push(`${fromRoot(file)}: ${node.getText()}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed(file));
  return found;
};

describe("law 11: one file per stage, and none over 300 lines", () => {
  it("no file has more than 300 lines", () => {
    expect(code.filter(file => linesOf(file).length > 300).map(fromRoot)).toEqual([]);
  });

  it("no process name repeats anywhere in Kenon", () => {
    const classes = sourceFiles().flatMap(file =>
      parsed(file).statements.flatMap(statement =>
        ts.isClassDeclaration(statement) && statement.name ? [statement.name.text] : [],
      ),
    );
    expect(classes.filter((name, index) => classes.indexOf(name) !== index)).toEqual([]);
  });
});

describe("law 12: simple, typed, and a gate that cannot be cheated", () => {
  it("no line is longer than 120 characters, so a file cannot be compacted into fewer lines", () => {
    const long = code.flatMap(file =>
      linesOf(file).flatMap((line, index) => (line.length > 120 ? [`${fromRoot(file)}:${index + 1}`] : [])),
    );
    expect(long).toEqual([]);
  });

  it("no unsafe cast in the source, its specs or its tests", () => {
    const typescript = code.filter(file => file.endsWith(".ts"));
    expect(typescript.flatMap(castsOf)).toEqual([]);
  });

  it("no comment switches a check off", () => {
    const halves = [
      ["eslint", "disable"],
      ["eslint", "enable"],
      ["@ts", "ignore"],
      ["@ts", "nocheck"],
      ["@ts", "expect-error"],
      ["prettier", "ignore"],
    ];
    const escapes = halves.map(parts => parts.join("-"));
    const cheating = code.filter(file => escapes.some(escape => readFileSync(file, "utf8").includes(escape)));
    expect(cheating.map(fromRoot)).toEqual([]);
  });

  it("the compiler stays strict", () => {
    const config: unknown = ts.parseConfigFileTextToJson(
      "tsconfig.json",
      readFileSync(join(root, "tsconfig.json"), "utf8"),
    ).config;
    expect(fieldOf(config, "compilerOptions")).toMatchObject({
      strict: true,
      erasableSyntaxOnly: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
    });
  });
});
