import { nodeEvent } from "../interaction/node-events.ts";
import { controlResolvedNode } from "../interaction/resolved-node.ts";
import { applyControlEvent } from "../interaction/control-nodes.ts";
import { freezeDeep } from "../json.ts";
import { checkPublicCatalogExercises, type PublicCatalogExercises } from "./exercises.ts";
import { stackNode, type StackNode } from "../interaction/place.ts";

/** Local session state only. No admission, persistence, controller command or success receipt. */
export function reduceCatalogDraft(current: PublicCatalogExercises, input: unknown): PublicCatalogExercises {
  checkPublicCatalogExercises(current);
  const event = nodeEvent(input);
  if (event.kind !== "input.change" && !("control" in event)) throw new Error("LOCAL_DRAFT_EVENT_REQUIRED");
  let matched = false;
  function update(node: StackNode): StackNode {
    if (event.kind === "input.change" && (node.kind === "input.text" || node.kind === "input.multiline") && node.name === event.name) {
      if (node.disabled) throw new Error("CONTROL_DISABLED");
      matched = true;
      return stackNode({ ...node, value: event.value });
    }
    if ("control" in event && "control" in node && node.control.id === event.control) {
      matched = true;
      return stackNode(controlResolvedNode(applyControlEvent(node.control, event).node));
    }
    return node;
  }
  const stacks = current.stacks.map(stack => ({ ...stack, items: stack.items.map(update) }));
  if (!matched) throw new Error("UNKNOWN_DRAFT_TARGET");
  return freezeDeep({ ...current, stacks });
}
