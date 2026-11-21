// Folds which tools call each identity, and offers attend and unattend acts.
import { ids } from "./ids.ts";
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
  // A fact from before 21/11 carries its reminder's delay; only `null` stops the call.
  if (event.kind === "attention") {
    if (event.data.delay === null) next.delete(event.data.tool);
    else next.set(event.data.tool, { since: event.id });
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
