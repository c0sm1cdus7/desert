// The bank grows only on purpose: its kinds are these fifteen, written here, and the union has no other.
import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import { pieceKinds } from "../../src/surface/pieces/pieces.ts";
import { root } from "../support/sources.ts";

const fifteen = [
  "surface",
  "bar",
  "beat",
  "toolbar",
  "action",
  "notice",
  "entry",
  "row",
  "stack",
  "list",
  "options",
  "event",
  "thread",
  "focus",
  "panel",
];
/** The kinds the union of pieces declares, read from its type. */
function unionKinds(): readonly string[] {
  const file = join(root, "src/surface/pieces/pieces.ts");
  const program = ts.createProgram([file], { noEmit: true, allowImportingTsExtensions: true, strict: true });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const alias = source?.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === "Piece",
  );
  if (!alias) throw new Error("pieces.ts declares no Piece");
  const kind = checker.getTypeAtLocation(alias.name).getProperty("kind");
  if (!kind) throw new Error("Piece has no kind");
  const type = checker.getTypeOfSymbol(kind);
  return (type.isUnion() ? type.types : [type]).flatMap(part => (part.isStringLiteral() ? [part.value] : []));
}
it("names exactly the fifteen kinds of the approved form, in order", () => {
  expect([...pieceKinds]).toEqual(fifteen);
});
it("every kind of the union of pieces is one of them, and every one of them is a kind of the union", () => {
  expect([...unionKinds()].sort()).toEqual([...fifteen].sort());
});
