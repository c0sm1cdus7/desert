import { ResolvedNodeVersion, resolvedNode, type ResolvedNode } from "../../../../interaction/resolved-node.ts";
import type { NodeEvent } from "../../../../interaction/node-events.ts";
import { say } from "../../../infra/messages.ts";
import { m } from "../../../../messages/keys.ts";

/** Local diagnostic state only. It cannot call a product controller or command. */
export function catalogSpecimen(initial: ResolvedNode, oncatalog: (event: NodeEvent) => void) {
  let node = $state.raw(initial);
  let notice = $state("");
  let release: ReturnType<typeof setTimeout> | undefined;
  function interact(event: NodeEvent) {
    if (event.kind === "catalog.open" || event.kind === "catalog.back" || event.kind === "catalog.search") oncatalog(event);
    else if (event.kind === "collection.select") oncatalog({ kind: "catalog.open", record: event.id });
    else if (event.kind === "input.change" && (node.kind === "input.text" || node.kind === "input.multiline")) {
      node = resolvedNode({ ...node, value: event.value });
      notice = say(m.publicCatalogBankSpecimen.writing);
    } else if (event.kind === "local.invoke" && event.intent.kind === "specimen") {
      if (event.intent.operation === "open" && (node.kind === "transient" || node.kind === "problem")) {
        node = resolvedNode({ ...node, open: true });
        if (node.kind === "transient" && node.locked) {
          clearTimeout(release);
          release = setTimeout(() => { if (node.kind === "transient") node = resolvedNode({ ...node, locked: false }); }, 3000);
        }
      } else notice = say(m.publicCatalogBankSpecimen.pressed);
    } else if (event.kind === "transient.close" || event.kind === "problem.close" ||
      (event.kind === "surface.invoke" && (event.intent.kind === "close" || event.intent.kind === "back"))) {
      if (node.kind === "transient" || node.kind === "problem") node = resolvedNode({ ...node, open: false });
    }
  }
  return {
    get node() { return node; }, get notice() { return notice; }, interact,
    get opener() { return resolvedNode({ version: ResolvedNodeVersion, kind: "action", role: "secondary", action: {
      intent: { kind: "specimen", operation: "open" }, label: say(m.publicCatalogBankSpecimen.open, { kind: node.kind }), icon: "open", state: "ready" } }); },
    dispose: () => clearTimeout(release),
  };
}
