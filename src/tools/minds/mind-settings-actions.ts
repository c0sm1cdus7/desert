// Permite al administrador asignar una carta aprobada al asistente de una identidad.
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import type { Capability } from "../../fields/capabilities.ts";
import { assistantOf } from "../../fields/mind-actor.ts";
import { effect } from "../../house/facts.ts";
import { mindModelAdmin, mindModelCard, mindModelTarget, mindModelAssigned } from "../../texts/mind-models.texts.ts";
import type { Language } from "../../fields/languages.ts";
import { toolAct } from "../act-definition.ts";
import type { Program } from "../tool-contract.ts";
export type EligibleCard = Readonly<{ name: string; version: string; capabilities: readonly Capability[] }>;
const input = object({ card: Type.String({ minLength: 1 }), version: Type.String({ minLength: 1 }) });
export function assignMindCard<X extends Program>(eligible: readonly EligibleCard[], language: Language) {
  const required = (value: unknown) => {
    if (value === undefined || value === null) throw new Error("eligible");
  };
  required(eligible);
  required(language);
  return {
    ...toolAct<X, typeof input>(input, (value, { by, state, target }) => {
      if (by !== state.house.admin) return { status: "rejected", reason: mindModelAdmin.text(language, {}) };
      const owner = target.startsWith("identities/") ? target.slice("identities/".length) : "";
      if (!owner || !state.house.assistants.get(owner)?.enabled)
        return { status: "rejected", reason: mindModelTarget.text(language, {}) };
      const card = eligible.find(each => each.name === value.card && each.version === value.version);
      if (!card) return { status: "rejected", reason: mindModelCard.text(language, {}) };
      return {
        status: "accepted",
        text: mindModelAssigned.text(language, {}),
        effects: [
          effect(
            "mind-card-assigned",
            { mind: assistantOf(owner), card: card.name, version: card.version, capabilities: [...card.capabilities] },
            by,
          ),
        ],
      };
    }),
    on: "thing" as const,
  };
}
