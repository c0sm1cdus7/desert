import { Check } from "@sinclair/typebox/value";
import { freezeDeep } from "../json.ts";
import { controlNode } from "../interaction/control-nodes.ts";
import { ViewSchema, type View, type ViewItem } from "./schema.ts";
import { viewSnapshot } from "./snapshot.ts";
import { viewInputs } from "./ports.ts";

/** Validated authoring data, not a mounted view or authority to execute an output. */
export function view(value: unknown): View {
  const snapshot = viewSnapshot(value);
  if (!Check(ViewSchema, snapshot)) throw new Error("INVALID_VIEW");
  const identities = new Set<string>();
  function identity(id: string) {
    if (identities.has(id)) throw new Error("DUPLICATE_VIEW_CONTENT_ID");
    identities.add(id);
  }
  function leaf(node: ViewItem) {
    if (node.kind === "text" || node.kind === "fact") return;
    if (node.kind !== "collection" && node.kind !== "form" && node.kind !== "context") controlNode(node);
    identity(node.id);
  }
  let headers = 0;
  for (const item of snapshot.content) {
    if (item.kind === "header") {
      if (++headers > 1) throw new Error("MULTIPLE_VIEW_HEADERS");
      identity(item.id);
    } else if (item.kind === "visual-catalog") identity(item.id);
    else if (item.kind === "stack") {
      identity(item.id);
      for (const child of item.items) leaf(child);
    } else leaf(item);
  }
  const outputs = new Set(snapshot.outputs ?? []);
  if (outputs.size !== (snapshot.outputs?.length ?? 0)) throw new Error("DUPLICATE_VIEW_OUTPUT");
  const inputs = viewInputs(snapshot);
  if (new Set(inputs.map(port => port.input)).size !== inputs.length) throw new Error("DUPLICATE_VIEW_INPUT");
  for (const port of inputs) {
    if (port.kind === "collection" && !outputs.has(port.output)) throw new Error("UNDECLARED_VIEW_OUTPUT");
  }
  for (const toolbar of [snapshot.topDock, snapshot.bottomDock]) {
    for (const action of toolbar?.actions ?? []) {
      if (!outputs.has(action.output)) throw new Error("UNDECLARED_VIEW_OUTPUT");
    }
  }
  return freezeDeep(snapshot);
}
