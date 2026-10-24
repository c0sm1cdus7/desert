// Law (plan §14) at the product source gate: a product writes human text only in `messages/<locale>.json`; declarations name
// it through the generated `messages/keys.ts`. Raises LITERAL_TEXT (a sentence or a hand-made message in a declaration) and
// MESSAGE_DERIVATION (keys.ts missing, stale or edited by hand). The bundles themselves are checked by the generator.
import { basename, dirname, relative, sep } from "node:path";
import ts from "typescript";
import { normalizedTypeScript } from "./catalog/normalize-source.ts";
import { bundleLocale, generateMessageKeys, messagesFolder } from "../messages/generate.ts";
import { messageFields } from "../views/declared.ts";
import { authoringEntrypoint, productKeysModule } from "./imports.ts";

export { productKeysModule };

/** The command a product runs to write its keys module; the generated header names it. */
export const productMessagesCommand = "npm run messages:write";
const fields: ReadonlySet<string> = new Set(messageFields);
/** Calls whose arguments name domain facts or ports, never sentences (`references(Project, { label: "name" })`). */
const domainCalls: ReadonlySet<string> = new Set(["objectType", "text", "integer", "enumeration", "principal", "imageAsset",
  "mediaAsset", "labels", "references", "namedReferences", "mediaReferences", "viewPorts", "factReference", "viewOutput",
  "initializeInput", "chooseFile", "inputMask", "createCommand", "updateCommand", "fromInput", "literal", "capability", "controllerRole"]);

const sourceName = (root: string, path: string) => relative(root, path).split(sep).join("/");

/** A product file that may be a bundle: `messages/<locale>.json` directly under the source root. */
export const isProductBundle = (root: string, path: string) =>
  sourceName(root, dirname(path)) === messagesFolder && bundleLocale(basename(path)) !== undefined;

/** The keys module the bundles generate; a product without bundles has no keys module. */
export function productMessageKeys(bundles: ReadonlyMap<string, string>): string {
  return generateMessageKeys(bundles, { catalogModule: authoringEntrypoint, command: productMessagesCommand });
}

/** keys.ts equals its regeneration from the bundles (formatting aside), and exists exactly when bundles do. */
export function assertProductMessageKeys(bundles: ReadonlyMap<string, string>, keys: string | undefined): void {
  const fix = `run \`${productMessagesCommand}\``;
  if (!bundles.size && keys === undefined) return;
  if (!bundles.size) throw new Error(`MESSAGE_DERIVATION: ${productKeysModule} has no ${messagesFolder}/<locale>.json bundle to derive from`);
  if (keys === undefined) throw new Error(`MESSAGE_DERIVATION: ${productKeysModule} is missing; ${fix}`);
  if (normalizedTypeScript(keys) !== normalizedTypeScript(productMessageKeys(bundles))) {
    throw new Error(`MESSAGE_DERIVATION: ${productKeysModule} differs from the ${messagesFolder} bundles; ${fix}`);
  }
}

/** The SDK names this file imports, local name → exported name. */
function sdkNames(file: ts.SourceFile): ReadonlyMap<string, string> {
  const names = new Map<string, string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
      || statement.moduleSpecifier.text !== authoringEntrypoint) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) for (const item of bindings.elements) names.set(item.name.text, (item.propertyName ?? item.name).text);
  }
  return names;
}

/** No sentence and no hand-made `{ key }` in a declaration: human text comes from `m`, which the keys module generates. */
export function assertNoLiteralText(root: string, file: ts.SourceFile): void {
  if (sourceName(root, file.fileName) === productKeysModule) return;
  const names = sdkNames(file);
  const fail = (node: ts.Node, what: string): never => {
    const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
    throw new Error(`LITERAL_TEXT: ${sourceName(root, file.fileName)}:${line}: ${what}; write it in ${messagesFolder}/<locale>.json and use m.<owner>.<meaning>`);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && domainCalls.has(names.get(node.expression.text) ?? "")) return;
    if (ts.isObjectLiteralExpression(node) && node.properties.length === 1) {
      const [only] = node.properties;
      if (only && (ts.isPropertyAssignment(only) || ts.isShorthandPropertyAssignment(only)) && only.name.getText(file).replaceAll(/["']/g, "") === "key") {
        fail(node, "a message written by hand");
      }
    }
    if (ts.isPropertyAssignment(node) && !ts.isComputedPropertyName(node.name)) {
      const field = node.name.getText(file).replaceAll(/["']/g, ""), value = node.initializer;
      if (fields.has(field) && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value) || ts.isTemplateExpression(value))) {
        fail(value, `${field} is the literal ${value.getText(file)}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
