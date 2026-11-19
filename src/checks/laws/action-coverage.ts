// Trace action factories to registered catalog slots, including aliases and helper functions.
import ts from "typescript";
import { catalogLawTexts as words } from "../../texts/catalog-laws.texts.ts";
import { nodeLocation, visitNodes, type CatalogGraph } from "./catalog-graph.ts";
type ActionDefinition = Readonly<{ node: ts.Node; owner: ts.Symbol | undefined }>;
export function registeredActions(graph: CatalogGraph) {
  const roots = new Set<ts.Symbol>();
  const definitions: ActionDefinition[] = [];
  for (const file of graph.production)
    visitNodes(file, node => {
      if (ts.isPropertyAssignment(node) && ["acts", "own"].includes(node.name.getText().replaceAll('"', ""))) {
        visitNodes(node.initializer, item => {
          if (ts.isIdentifier(item)) {
            const symbol = graph.symbol(item);
            if (symbol) roots.add(symbol);
          }
        });
      }
      if (ts.isShorthandPropertyAssignment(node) && node.name.text === "own") {
        const symbol = graph.symbol(node.name);
        if (symbol) roots.add(symbol);
      }
      if (ts.isCallExpression(node)) {
        const name = graph.factoryName(node.expression, "desert/programa") ?? node.expression.getText();
        if (["programAct", "toolAct", "ownAct"].includes(name)) definitions.push({ node, owner: graph.owner(node) });
      }
    });
  const live = graph.reachable(roots);
  return { live, definitions, emits: actionEmissions(graph, live, definitions) };
}
function actionEmissions(graph: CatalogGraph, live: ReadonlySet<ts.Symbol>, definitions: readonly ActionDefinition[]) {
  const runs = new Set<ts.Symbol>(),
    bodies = new Set<ts.Node>();
  for (const file of graph.production)
    visitNodes(file, node => {
      if (
        (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node) || ts.isMethodDeclaration(node)) &&
        node.name.getText() === "run"
      ) {
        const symbol = graph.symbol(node.name);
        if (symbol && live.has(symbol)) runs.add(symbol);
      }
    });
  for (const { node, owner } of definitions) {
    if (
      !owner ||
      !live.has(owner) ||
      !ts.isCallExpression(node) ||
      graph.factoryName(node.expression, "desert/programa") !== "ownAct"
    )
      continue;
    const run = node.arguments[3];
    if (!run) continue;
    bodies.add(run);
    visitNodes(run, child => {
      if (!ts.isIdentifier(child)) return;
      const symbol = graph.symbol(child);
      if (symbol) runs.add(symbol);
    });
  }
  const emitters = graph.reachable(runs);
  return (node: ts.Node) => {
    for (let parent = node; !ts.isSourceFile(parent); parent = parent.parent) if (bodies.has(parent)) return true;
    const owner = graph.owner(node);
    return !!owner && emitters.has(owner);
  };
}

export function actionCatalogCoverage(graph: CatalogGraph): string[] {
  const { live, definitions } = registeredActions(graph);
  return definitions
    .filter(item => !item.owner || !live.has(item.owner))
    .map(item => words.action(nodeLocation(item.node)));
}
