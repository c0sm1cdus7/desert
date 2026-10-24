// Law: native controls are drawn only inside a foundation (its folder, or a vendor family it owns), and the browser's own
// media controls nowhere. Raises NATIVE_CONTROL_OUTSIDE_FOUNDATION.
import { posix } from "node:path";
import { walk, type SyntaxNode } from "./walk.ts";
import type { ContentRule, GateContext } from "./context.ts";
import { violation, type Violation } from "./violation.ts";

const controls = new Set(["input", "button", "select", "textarea", "details", "dialog"]);
const media = new Set(["video", "audio"]);

const attributeNames = (element: SyntaxNode): string[] => {
  const attributes: unknown = element.attributes;
  if (!Array.isArray(attributes)) return [];
  return attributes.flatMap((attribute: unknown) => {
    const type = attribute && typeof attribute === "object" ? Reflect.get(attribute, "type") : undefined;
    const name = attribute && typeof attribute === "object" ? Reflect.get(attribute, "name") : undefined;
    return type === "Attribute" && typeof name === "string" ? [name] : [];
  });
};

/** The native control an element is, as a message names it, or undefined. */
function controlOf(element: SyntaxNode): string | undefined {
  const name = typeof element.name === "string" ? element.name : "";
  if (controls.has(name)) return name;
  return name === "a" && attributeNames(element).includes("href") ? "a href" : undefined;
}

/** Who draws a file that is not a foundation, as a message names it; undefined for a foundation or its vendor family. */
function drawer(context: GateContext, path: string): string | undefined {
  const owner = context.owners.of(path);
  if (owner?.kind === "vendor") return undefined;
  if (owner?.kind === "piece") return owner.pieceKind === "foundation" ? undefined : `${owner.pieceKind} ${owner.id}`;
  const inFoundationFolder = context.declarations.some(located =>
    located.declaration.kind === "foundation" && path.startsWith(`${posix.dirname(located.path)}/`));
  if (inFoundationFolder) return undefined;
  if (owner?.kind === "mechanism") return `mechanism ${owner.id}`;
  return path.startsWith(`${context.layout.vendorFamilies}/`) ? "an undeclared vendor family" : "no foundation";
}

export const ruleH: ContentRule = context => {
  const found: Violation[] = [];
  for (const path of context.paths) {
    if (!path.endsWith(".svelte")) continue;
    const parsed = context.parsed(path);
    if (parsed.kind !== "svelte") continue;
    const owner = drawer(context, path);
    walk(parsed.fragment, node => {
      if (node.type !== "RegularElement") return;
      const line = parsed.line(node.start ?? 0), name = typeof node.name === "string" ? node.name : "";
      if (media.has(name) && attributeNames(node).includes("controls")) {
        found.push(violation("NATIVE_CONTROL_OUTSIDE_FOUNDATION", path, line, `<${name} controls> draws the browser's own media controls`));
      }
      const control = controlOf(node);
      if (control !== undefined && owner !== undefined) {
        found.push(violation("NATIVE_CONTROL_OUTSIDE_FOUNDATION", path, line, `<${control}> is drawn by ${owner}: native controls live in a foundation`));
      }
    });
  }
  return found;
};
