import { parse } from "svelte/compiler";
import { classifyVisualSource, digest, finding, type Finding, type VisualSource } from "./model.ts";
import { inspectScript } from "./script.ts";
import { componentEventExpression, domOwnershipFingerprint } from "./dom-ownership.ts";
import { assertPrivateCompositionSlots, closedCompositionOwners } from "./composition.ts";
import { walk, type SyntaxNode } from "./walk.ts";

/** Source evidence only. It does not certify the emitted CSS or semantic manifest. */
export function inspectVisualSource(path: string, source: string): VisualSource {
  const { role, owner } = classifyVisualSource(path);
  const findings: Finding[] = [], imports: string[] = [];
  const add = (code: string, node: { start?: number; end?: number }) => findings.push(finding(path, source, code, node.start ?? 0, node.end ?? source.length));
  const script = (text: string, offset: number) => {
    const result = inspectScript(path, source, text, offset, role);
    findings.push(...result.findings); imports.push(...result.imports);
  };
  try {
    if (path.endsWith(".svelte")) {
      const tree = parse(source, { modern: true });
      const privateComposition = closedCompositionOwners.has(path);
      let lexicalSlots = false;
      if (privateComposition) {
        try {
          assertPrivateCompositionSlots(tree.fragment as unknown as SyntaxNode, reason => { throw new Error(reason); });
          lexicalSlots = true;
        } catch { /* Unproven composition retains its slot findings below. */ }
      }
      for (const block of [tree.instance, tree.module]) if (block) {
        const content = block.content as typeof block.content & { start: number; end: number };
        script(source.slice(content.start, content.end), content.start);
      }
      if (tree.css && role === "adapter") add("RENDERER_CSS", tree.css);
      if (role !== "vendor-private") walk(tree.fragment, (node, parent) => {
        if (role === "adapter" && ["RegularElement", "SvelteElement"].includes(node.type ?? "")) findings.push({
          ...finding(path, source, "RENDERER_DOM", node.start!, node.end!),
          ownershipFingerprint: domOwnershipFingerprint(path, source, node),
        });
        if (role === "adapter" && node.type === "Text" && parent?.type === "Fragment" && String(node.data ?? "").trim()) add("RENDERER_TEXT", node);
        if (node.type === "HtmlTag") add("RAW_HTML", node);
        if (node.type === "SnippetBlock" && !lexicalSlots
          || node.type === "RenderTag" && (role === "adapter" || privateComposition && !lexicalSlots)) add("RENDER_SLOT", node);
        if (node.type === "Component") {
          for (const attribute of node.attributes as SyntaxNode[]) {
            const event = componentEventExpression(attribute);
            if (role === "adapter" && event) script(source.slice(event.start, event.end), event.start!);
            const name = String(attribute.name ?? "");
            if (attribute.type === "SpreadAttribute" || ["StyleDirective", "ClassDirective", "UseDirective", "TransitionDirective"].includes(attribute.type ?? "")
              || attribute.type === "BindDirective" && ["this", "ref", "element", "row", "viewport"].includes(name)
              || attribute.type === "Attribute" && (/^(class|style|role|elementProps|viewportAttributes)$/.test(name) || name.startsWith("data-"))) {
              add("OPEN_COMPONENT_INPUT", attribute);
            }
          }
        }
      });
      if (tree.css && role !== "vendor-private") walk(tree.css, node => {
        if (node.type === "Rule" && /:global\b/.test(source.slice((node.prelude as SyntaxNode).start, (node.prelude as SyntaxNode).end))) add("GLOBAL_SELECTOR", node);
      });
    } else if (/\.(ts|[cm]?js)$/.test(path)) script(source, 0);
    // Shared CSS modules are inventoried as candidate mechanisms, not misreported
    // as consumer overrides merely for owning a shared recipe. Authority remains unqualified.
  } catch (error) {
    findings.push({ ...finding(path, source, "UNINSPECTABLE_SOURCE", 0, source.length), operation: String(error) });
  }
  return { path, role, owner, digest: digest(source), imports: [...new Set(imports)].sort(), findings };
}
