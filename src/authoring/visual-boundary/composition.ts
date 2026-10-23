import { bindingNames } from "./adapter.ts";
import type { SyntaxNode as Node } from "./walk.ts";
import { catalogClosureSources } from "../../svelte/catalog-admissions.ts";

/** Closed public APIs may compose private lexical slots. Unlike a primitive,
 * their implementation can own layout, but callers cannot supply rendering. */
export const closedCompositionOwners = catalogClosureSources("private-composition");

export function assertPrivateCompositionSlots(fragment: Node, fail: (reason: string) => never): void {
  function without(scope: ReadonlySet<string>, patterns: (Node | undefined)[], names: string[] = []) {
    const local = new Set(scope);
    for (const name of [...patterns.flatMap(bindingNames), ...names]) local.delete(name);
    return local;
  }
  function visit(value: unknown, scope: ReadonlySet<string>): void {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { for (const node of value) visit(node, scope); return; }
    const node = value as Node;
    if (node.type === "SpreadAttribute") fail("composition native/prop forwarding");
    if (node.type === "Fragment") {
      const local = new Set(scope), nodes = node.nodes as Node[];
      for (const child of nodes) {
        if (child.type === "SnippetBlock") local.add(String((child.expression as Node).name));
        if (child.type === "ConstTag") for (const binding of (child.declaration as Node).declarations as Node[]) {
          for (const name of bindingNames(binding.id as Node)) local.delete(name);
        }
      }
      visit(nodes, local);
      return;
    }
    if (node.type === "RenderTag") {
      const expression = node.expression as Node, callee = expression.callee as Node | undefined;
      if (expression.type !== "CallExpression" || callee?.type !== "Identifier" || !scope.has(String(callee.name))) {
        fail("composition public render forwarding");
      }
    }
    if (node.type === "SnippetBlock") {
      visit(node.body, without(scope, node.parameters as Node[]));
      return;
    }
    if (node.type === "EachBlock") {
      visit(node.body, without(scope, [node.context as Node], node.index ? [String(node.index)] : []));
      visit(node.fallback, scope);
      return;
    }
    if (node.type === "AwaitBlock") {
      visit(node.pending, scope);
      visit(node.then, without(scope, [node.value as Node]));
      visit(node.catch, without(scope, [node.error as Node]));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (!["loc", "name_loc", "comments", "leadingComments", "trailingComments"].includes(key)) visit(child, scope);
    }
  }
  visit(fragment, new Set());
}
