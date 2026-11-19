import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import { filesUnder, isSpec, parsed, src } from "../support/sources.ts";

function conversions(source: ts.SourceFile): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const call = node.expression;
      let member = "";
      if (ts.isPropertyAccessExpression(call)) member = call.name.text;
      if (ts.isElementAccessExpression(call) && ts.isStringLiteral(call.argumentExpression))
        member = call.argumentExpression.text;
      const safe = node.getText(source);
      const publicConversion =
        [
          'nonce.toString("base64")',
          'cipher.getAuthTag().toString("base64")',
          'encrypted.toString("base64")',
          "head.count.toString(16)",
        ].includes(safe) ||
        (source.fileName.endsWith("macos-house-keys.ts") &&
          [
            'Buffer.from(result.stdout).toString("utf8")',
            'Buffer.from(text, "hex").toString("utf8")',
            'Buffer.from(JSON.stringify(index)).toString("hex")',
          ].includes(safe));
      if ((member === "toString" && !publicConversion) || (ts.isIdentifier(call) && call.text === "String"))
        found.push(safe);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
it("la custodia no convierte material ni llaves a texto", () => {
  const files = filesUnder(join(src, "keychain")).filter(file => !isSpec(file));
  expect(files.flatMap(file => conversions(parsed(file)).map(value => `${file}: ${value}`))).toEqual([]);
});
it("la ley rechaza conversiones directas y calculadas del material", () => {
  const source = ts.createSourceFile(
    "mutacion.ts",
    'material.toString(); String(material); material["toString"]()',
    ts.ScriptTarget.Latest,
    true,
  );
  expect(conversions(source)).toHaveLength(3);
});
