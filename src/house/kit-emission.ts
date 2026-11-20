// Convierte pedidos de escritura antiguos a V2 antes de anexarlos, sin modificar hechos guardados.
import { Value } from "@sinclair/typebox/value";
import { houseCatalog } from "./facts.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import type { Emission, Foreign } from "../journal/vocabulary.ts";
import type { House } from "./members.ts";
import { holderKit, selectionStep } from "./kit-history.ts";
import { explicitKit } from "./kit-selection.ts";
export function historicalKitEmission(event: Emission): boolean {
  return (
    event.layer === "house" &&
    ["granted", "kit-set", "assistant-kit-set", "journey-opened"].includes(event.kind) &&
    !("version" in event.data)
  );
}
/** Compatibility for callers of the old helper, evaluated against the house the journal converts with. */
export function currentKitEmission<P extends Foreign>(event: Emission<P>, house: House): Emission<P> {
  if (event.layer !== "house") return event;
  if (!Value.Check(houseCatalog[event.kind], event.data)) throw new Error(journalTexts.invalidEvent);
  if (event.kind === "assistant-kit-set" && !("version" in event.data))
    return {
      ...event,
      data: { version: 2, owner: event.data.owner, kit: explicitKit(event.data.kit, house.kitLayout) },
    };
  if (event.kind === "journey-opened" && !("version" in event.data))
    return { ...event, data: { version: 2, goal: event.data.goal, kit: explicitKit(event.data.kit, house.kitLayout) } };
  if ((event.kind === "granted" || event.kind === "kit-set") && !("version" in event.data)) {
    const next = selectionStep(house, { ...event, id: "conversion", seq: 0, at: 0 });
    return event.kind === "granted"
      ? { ...event, data: { version: 2, identity: event.data.identity, kit: holderKit(next, event.data.identity) } }
      : { ...event, data: { version: 2, holder: event.data.holder, kit: holderKit(next, event.data.holder) } };
  }
  return event;
}
