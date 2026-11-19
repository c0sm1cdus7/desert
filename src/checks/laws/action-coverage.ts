// Trace action factories to registered catalog slots, including aliases and helper functions.
import ts from "typescript";
import { catalogLawTexts as words } from "../../texts/catalog-laws.texts.ts";
import { nodeLocation, visitNodes, type CatalogGraph } from "./catalog-graph.ts";
export function registeredActions(graph: CatalogGraph) {
  const roots = new Set<ts.Symbol>();
  const definitions: { node: ts.Node; owner: ts.Symbol | undefined }[] = [];
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
        const name = graph.symbol(node.expression)?.name ?? node.expression.getText();
        if (["programAct", "toolAct", "ownAct"].includes(name)) definitions.push({ node, owner: graph.owner(node) });
      }
    });
  const live = graph.reachable(roots);
  return { live, definitions };
}
export function actionCatalogCoverage(graph: CatalogGraph): string[] {
  const { live, definitions } = registeredActions(graph);
  return definitions
    .filter(item => !item.owner || !live.has(item.owner))
    .map(item => words.action(nodeLocation(item.node)));
}
