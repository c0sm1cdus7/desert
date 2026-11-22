import { realpathSync } from "node:fs";
import ts from "typescript";
export interface ProgramDeclaration {
  file: string;
  constructor: string;
}
/** Only codigo in the real program constructor may read its own source directory. */
export function programDirectory(
  node: ts.MetaProperty,
  checker: ts.TypeChecker,
  declaration?: ProgramDeclaration,
): boolean {
  if (!declaration || node.getSourceFile().fileName !== declaration.file) return false;
  const access = node.parent;
  if (!ts.isPropertyAccessExpression(access) || access.name.text !== "dirname") return false;
  const array = access.parent;
  if (!ts.isArrayLiteralExpression(array)) return false;
  const property = array.parent;
  if (!ts.isPropertyAssignment(property) || property.name.getText() !== "code") return false;
  const metadata = property.parent;
  const call = metadata.parent;
  if (!ts.isCallExpression(call) || call.arguments[0] !== metadata) return false;
  const origin = checker.getResolvedSignature(call)?.declaration?.getSourceFile().fileName;
  return origin !== undefined && realpathSync(origin) === realpathSync(declaration.constructor);
}
