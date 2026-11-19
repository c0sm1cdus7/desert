// Every declared state-changing fact has an action emitter or an explicit autonomous owner.
import ts from "typescript";
import { houseCatalog } from "../../house/facts.ts";
import { catalogLawTexts as words } from "../../texts/catalog-laws.texts.ts";
import { registeredActions } from "./action-coverage.ts";
import { autonomousFacts } from "./autonomous-facts.ts";
import { nodeLocation, visitNodes, type CatalogGraph } from "./catalog-graph.ts";
function values(graph: CatalogGraph, node: ts.Node | undefined, seen = new Set<ts.Node>()): string[] {
  if (!node || seen.has(node)) return [];
  seen.add(node);
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isConditionalExpression(node))
    return [...values(graph, node.whenTrue, seen), ...values(graph, node.whenFalse, seen)];
  const type = graph.checker.getTypeAtLocation(node);
  return (type.isUnion() ? type.types : [type]).flatMap(part => (part.isStringLiteral() ? [part.value] : []));
}
function declarations(graph: CatalogGraph, argument: ts.Expression): readonly [string, string][] {
  return graph.checker
    .getTypeAtLocation(argument)
    .getProperties()
    .map(property => [property.name, nodeLocation(property.declarations?.[0] ?? argument)]);
}
function emitter(graph: CatalogGraph, node: ts.CallExpression): boolean {
  const symbol = graph.symbol(node.expression);
  if (!symbol || !["effect", "fact"].includes(symbol.name)) return false;
  // Custody has a private audit ledger, not house facts; its similarly named method is not a vocabulary factory.
  if (!ts.isPropertyAccessExpression(node.expression) || symbol.name === "effect") return true;
  return (
    symbol.declarations?.some(declaration =>
      declaration.getSourceFile().fileName.endsWith("/journal/vocabulary.ts"),
    ) === true
  );
}
function installableFacts(graph: CatalogGraph, node: ts.Node, found: Map<string, string>, seen = new Set<ts.Node>()) {
  if (seen.has(node)) return;
  seen.add(node);
  visitNodes(node, child => {
    if (ts.isPropertyAssignment(child) && child.name.getText() === "nombre")
      for (const kind of values(graph, child.initializer)) found.set(kind, nodeLocation(child));
    if (ts.isIdentifier(child)) {
      for (const declaration of graph.symbol(child)?.declarations ?? [])
        if (ts.isVariableDeclaration(declaration) && declaration.initializer)
          installableFacts(graph, declaration.initializer, found, seen);
    }
  });
}
function literalFact(graph: CatalogGraph, node: ts.Node): string[] {
  if (!ts.isObjectLiteralExpression(node)) return [];
  const property = (name: string) =>
    node.properties.find(item => ts.isPropertyAssignment(item) && item.name.getText() === name);
  const layer = property("layer"),
    kind = property("kind");
  return layer &&
    kind &&
    ts.isPropertyAssignment(layer) &&
    ts.isPropertyAssignment(kind) &&
    values(graph, layer.initializer).some(value => value === "house" || value === "program")
    ? values(graph, kind.initializer)
    : [];
}
export function factCoverage(graph: CatalogGraph, autonomous = autonomousFacts): string[] {
  const { live } = registeredActions(graph);
  const emitted = new Set<string>(),
    declared = new Map<string, string>();
  const core = graph.production.find(file => file.fileName.endsWith("/house/facts.ts"));
  if (core) for (const kind of Object.keys(houseCatalog)) declared.set(kind, nodeLocation(core));
  for (const file of graph.production)
    visitNodes(file, node => {
      if (ts.isPropertyAssignment(node) && node.name.getText() === "hechos")
        installableFacts(graph, node.initializer, declared);
      const owner = graph.owner(node);
      for (const kind of literalFact(graph, node)) {
        if (!declared.has(kind)) declared.set(kind, nodeLocation(node));
        if (owner && live.has(owner)) emitted.add(kind);
      }
      if (!ts.isCallExpression(node)) return;
      if (graph.symbol(node.expression)?.name === "vocabulary" && node.arguments[0])
        for (const [kind, where] of declarations(graph, node.arguments[0])) declared.set(kind, where);
      if (!emitter(graph, node)) return;
      for (const kind of values(graph, node.arguments[0])) {
        if (!declared.has(kind)) declared.set(kind, nodeLocation(node));
        if (owner && live.has(owner)) emitted.add(kind);
      }
    });
  return [...declared]
    .filter(([kind]) => !emitted.has(kind) && !autonomous[kind]?.trim())
    .map(([kind, where]) => words.fact(where, kind));
}
