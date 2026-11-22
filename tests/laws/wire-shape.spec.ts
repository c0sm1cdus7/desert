// The wire builds a screen field by field: no spread, no Object.assign, no JSON round trip copies a leaked key.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { root } from "../support/sources.ts";

const file = join(root, "src/surface/contract/wire.ts");
/** Every place a source copies a whole object instead of naming its fields, by line. */
function copiesIn(text: string): readonly string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  const at = (node: ts.Node): number => source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const visit = (node: ts.Node): void => {
    if (ts.isSpreadAssignment(node)) found.push(`${at(node)}: object spread`);
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(source);
      if (["Object.assign", "JSON.parse", "JSON.stringify", "structuredClone"].includes(callee))
        found.push(`${at(node)}: ${callee}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("the wire shape", () => {
  it("copies no screen whole in wire.ts", () => {
    expect(copiesIn(readFileSync(file, "utf8"))).toEqual([]);
  });
  it("refuses a planted wire with one object spread, one Object.assign and one JSON round trip", () => {
    const planted = [
      "export const wire = (screen: Screen): WireScreen => ({ ...screen });",
      "export const also = (screen: Screen): WireScreen => Object.assign({}, screen);",
      "export const again = (screen: Screen): WireScreen => JSON.parse(JSON.stringify(screen));",
    ].join("\n");
    expect(copiesIn(planted)).toEqual(["1: object spread", "2: Object.assign", "3: JSON.parse", "3: JSON.stringify"]);
  });
});
