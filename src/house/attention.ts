import { ids } from "./ids.ts";
export const reminderId = (by: string, tool: string): string => `${ids.attention}${JSON.stringify([by, tool])}`;
import { actCatalog } from "./own-acts.ts";
import type { Attention } from "./members.ts";
import { effect } from "./facts.ts";
import type { Event } from "../journal/vocabulary.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { accepted, ownAct, reading, rejected } from "../tools/act-definition.ts";
import { targetTool } from "./attendance.ts";
import type { OwnAct, Program, ToolRegistry } from "../tools/tool-contract.ts";
export function attentionStep(state: ReadonlyMap<string, Attention>, event: Event): ReadonlyMap<string, Attention> {
  const next = new Map(state);
  if (event.layer !== "house") return next;
  if (event.kind === "attention") {
    if (event.data.delay === null) next.delete(event.data.tool);
    else next.set(event.data.tool, { delay: event.data.delay, wake: "" });
  }
  if (event.kind === "wake-at") {
    const current = [...next].find(([tool]) => reminderId(event.by, tool) === event.data.id);
    if (current) next.set(current[0], { ...current[1], wake: event.id });
  }
  return next;
}
export const attendanceActs = <X extends Program>(registry: ToolRegistry<X>): OwnAct<X>[] =>
  (["attend", "unattend"] as const).map(option => {
    const act = ownAct<X, typeof actCatalog.attend.input>(
      ids.self,
      option,
      actCatalog[option],
      (input, { state, by }) => {
        const tool = targetTool(registry, state, input.target);
        if (!tool) return rejected(toolTexts.unknown);
        return accepted(effect(option === "attend" ? "attended" : "unattended", input, by));
      },
    );
    /** An attend brings into view something the identity has not read yet. */
    return option === "attend" ? reading(act) : act;
  });
