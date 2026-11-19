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
const vocabularyFactory = (graph: CatalogGraph, expression: ts.Expression) =>
  graph.factoryName(expression, "desert/journal") === "vocabulary";
function vocabularyValue(graph: CatalogGraph, node: ts.Node, seen = new Set<ts.Node>()): boolean {
  if (seen.has(node)) return false;
  seen.add(node);
  if (ts.isCallExpression(node)) return vocabularyFactory(graph, node.expression);
  return (
    graph
      .symbol(node)
      ?.declarations?.some(
        declaration =>
          ts.isVariableDeclaration(declaration) &&
          !!declaration.initializer &&
          vocabularyValue(graph, declaration.initializer, seen),
      ) === true
  );
}
function emitter(graph: CatalogGraph, node: ts.CallExpression): boolean {
  const symbol = graph.symbol(node.expression);
  if (symbol?.name === "effect") return true;
  if (!ts.isPropertyAccessExpression(node.expression)) return symbol?.name === "fact";
  if (node.expression.name.text !== "fact") return false;
  // Custody's private audit ledger has a different owner even though its method is also called fact.
  return (
    vocabularyValue(graph, node.expression.expression) ||
    symbol?.declarations?.some(declaration =>
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
function literalFact(graph: CatalogGraph, node: ts.Node, core: boolean): string[] {
  if (!ts.isObjectLiteralExpression(node)) return [];
  const property = (name: string) =>
    node.properties.find(item => ts.isPropertyAssignment(item) && item.name.getText() === name);
  const layer = property("layer"),
    kind = property("kind");
  return layer &&
    kind &&
    ts.isPropertyAssignment(layer) &&
    ts.isPropertyAssignment(kind) &&
    values(graph, layer.initializer).some(value => (core && value === "house") || value === "program")
    ? values(graph, kind.initializer)
    : [];
}
export function factCoverage(graph: CatalogGraph, autonomous = autonomousFacts): string[] {
  const { emits } = registeredActions(graph);
  const emitted = new Set<string>(),
    declared = new Map<string, string>();
  const core = graph.production.find(file => file.fileName.endsWith("/house/facts.ts"));
  if (core) for (const kind of Object.keys(houseCatalog)) declared.set(kind, nodeLocation(core));
  for (const file of graph.production)
    visitNodes(file, node => {
      if (ts.isPropertyAssignment(node) && node.name.getText() === "hechos")
        installableFacts(graph, node.initializer, declared);
      for (const kind of literalFact(graph, node, !!core)) {
        if (!declared.has(kind)) declared.set(kind, nodeLocation(node));
        if (emits(node)) emitted.add(kind);
      }
      if (!ts.isCallExpression(node)) return;
      if (vocabularyFactory(graph, node.expression) && node.arguments[0])
        for (const [kind, where] of declarations(graph, node.arguments[0])) declared.set(kind, where);
      if (!emitter(graph, node)) return;
      for (const kind of values(graph, node.arguments[0])) {
        if (!declared.has(kind)) declared.set(kind, nodeLocation(node));
        if (emits(node)) emitted.add(kind);
      }
    });
  return [...declared]
    .filter(([kind]) => !emitted.has(kind) && !autonomous[kind]?.trim())
    .map(([kind, where]) => words.fact(where, kind));
}
