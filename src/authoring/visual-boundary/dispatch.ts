import { parse } from "svelte/compiler";
import { DispatcherCapabilities } from "../../svelte/renderer-contracts.ts";
import { assertNoAdapterGlobals } from "./adapter-globals.ts";
import { dispatcherPath, registryPath, contractPath, dispatchKinds, dispatchTypes, assertRendererRegistry } from "./dispatch-contract.ts";
import { inspectDispatchScript } from "./dispatch-script.ts";
import { inspectVisualSource } from "./inspect.ts";
import { walk, type SyntaxNode as Node } from "./walk.ts";
type Source = Readonly<{ path: string; source: string }>;
const nodes = (fragment: Node) => (fragment.nodes as Node[]).filter(node => node.type !== "Comment"
  && !(node.type === "Text" && !String(node.data).trim()));
const pathOf = (node: Node | undefined): string | undefined => node?.type === "Identifier" ? String(node.name)
  : node?.type === "MemberExpression" && !node.computed && !node.optional
    ? `${pathOf(node.object as Node)}.${pathOf(node.property as Node)}` : undefined;

/** A bounded dispatcher grammar, not a frozen source snapshot: every validated
 * kind selects exactly one typed catalog owner. No alternate render path exists
 * in this component. Transitive owner internals remain separately audited. */
export function assertBankDispatcher(sources: readonly Source[]): void {
  const source = sources.find(item => item.path === dispatcherPath)?.source;
  if (source === undefined) return;
  const fail: (reason: string) => never = reason => { throw new Error(`CLOSED_VISUAL_BOUNDARY: ${dispatcherPath}: ${reason}`); };
  const registry = sources.find(item => item.path === registryPath)?.source;
  const contract = sources.find(item => item.path === contractPath)?.source;
  if (registry === undefined || contract === undefined) fail("missing dispatcher owners");
  assertRendererRegistry(registry, fail);
  const types = dispatchTypes(contract, fail);
  const tree = parse(source, { modern: true });
  if (!tree.instance || tree.module || tree.css) fail("opaque dispatcher source");
  const content = tree.instance.content as unknown as { start: number; end: number };
  const script = inspectDispatchScript(source.slice(content.start, content.end), types.inputs, fail);
  for (const finding of inspectVisualSource(dispatcherPath, source).findings) {
    if (["RENDERER_DOM", "RENDERER_TEXT", "RENDERER_CSS", "RENDERER_DOM_ACCESS", "RAW_HTML"].includes(finding.code)) fail(finding.code);
  }
  const root = nodes(tree.fragment as unknown as Node);
  if (root.length !== 1) fail("additional dispatch path");
  let branch = root[0];
  const found = new Set<string>(), capabilities = Object.values(DispatcherCapabilities);
  while (branch) {
    const test = branch.test as Node, kind = (test?.right as Node | undefined)?.value;
    if (branch.type !== "IfBlock" || test?.type !== "BinaryExpression" || test.operator !== "==="
      || pathOf(test.left as Node) !== `${script.checked}.kind` || typeof kind !== "string"
      || !dispatchKinds.has(kind) || found.has(kind)) fail("noncanonical dispatch branch");
    found.add(kind);
    const body = nodes(branch.consequent as Node), selection = body[0], render = body[1];
    const declarations = (selection?.declaration as Node | undefined)?.declarations as Node[] | undefined;
    const declaration = declarations?.[0], local = declaration?.id as Node | undefined, target = declaration?.init as Node | undefined;
    if (body.length !== 2 || selection?.type !== "ConstTag" || declarations?.length !== 1 || local?.type !== "Identifier"
      || target?.type !== "MemberExpression" || target.optional || pathOf(target.object as Node) !== script.registry
      || (target.computed ? pathOf(target.property as Node) !== `${script.checked}.kind`
        : pathOf(target.property as Node) !== kind)
      || render?.type !== "Component" || render.name !== local.name || nodes(render.fragment as Node).length) fail("foreign dispatch selection");
    const allowed = types.entries.get(kind)!;
    for (const attribute of render.attributes as Node[]) {
      if (attribute.type === "SpreadAttribute") {
        // Only admitted closed node subtrees can supply existing semantic fields.
        const projection = pathOf(attribute.expression as Node);
        if (!projection?.startsWith(`${script.checked}.`)) fail("unvalidated dispatcher spread");
      } else {
        const name = String(attribute.name);
        if (attribute.type !== "Attribute" || !allowed.has(name) || /^(class|style|children|data-|aria-)/.test(name)) fail("foreign dispatcher property");
        const capability = capabilities.find(item => item.property === name);
        if (capability) {
          const admitted = DispatcherCapabilities[kind as keyof typeof DispatcherCapabilities];
          const tag = Array.isArray(attribute.value) ? attribute.value.length === 1 ? attribute.value[0] as Node : undefined : attribute.value as Node;
          const value = tag?.type === "ExpressionTag" ? tag.expression as Node : undefined;
          const requiredHost = capability.required && value?.type === "CallExpression" && (value.arguments as Node[]).length === 0
            && script.hosts.has(String((value.callee as Node)?.name));
          if (admitted !== capability || !(requiredHost || !capability.required && pathOf(value) === capability.input)) fail("foreign dispatcher capability");
        }
      }
      walk(attribute, node => {
        if (node.type === "Identifier" && ["node", script.registry, String(local.name)].includes(String(node.name))) fail("unadmitted dispatch expression");
        if (["ImportExpression", "AssignmentExpression", "UpdateExpression", "TSAsExpression", "TSTypeAssertion"].includes(String(node.type))) fail("opaque dispatch expression");
      });
    }
    const next = branch.alternate ? nodes(branch.alternate as Node) : [];
    if (next.length > 1) fail("additional dispatch branch");
    branch = next[0];
  }
  if (found.size !== dispatchKinds.size) fail("incomplete dispatcher");
  assertNoAdapterGlobals(dispatcherPath, source, fail);
}
