// Declara los hechos públicos de turnos, consultas, revisiones, mensajes y escenas de proceso.
import { executionDestination } from "../../fields/device-protocol.ts";
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { mindName } from "../assistants/assistant-facts.ts";
import { mindText } from "./journey-facts.ts";
const turn = { turn: mindName };
const proposals = Type.Array(
  object({ act: mindName, target: mindName, input: Type.Unknown(), destination: Type.Optional(executionDestination) }),
  { maxItems: 32 },
);
export const mindFacts = {
  "mind-turn-opened": object({ ...turn, wake: Type.Array(mindName, { uniqueItems: true }) }),
  "mind-answer-invalid": object({
    ...turn,
    faults: Type.Array(object({ code: mindName, path: Type.String() }), { minItems: 1 }),
  }),
  "mind-consultation-requested": object({ ...turn, question: mindText, acts: proposals }),
  "mind-consultation-answered": object({
    ...turn,
    answer: mindText,
    source: Type.Union([Type.Literal("supervisor"), Type.Literal("unconfigured")]),
  }),
  "mind-review-recorded": object({
    ...turn,
    proposal: mindName,
    acts: proposals,
    rulesVersion: mindName,
    reason: Type.Union([
      Type.Literal("open"),
      Type.Literal("end"),
      Type.Literal("desist"),
      Type.Literal("world"),
      Type.Literal("consultation"),
    ]),
    result: Type.Union([Type.Literal("passed"), Type.Literal("rejected"), Type.Literal("failed")]),
    text: mindText,
  }),
  "mind-turn-closed": object({
    ...turn,
    outcome: Type.Union([Type.Literal("done"), Type.Literal("failed"), Type.Literal("interrupted")]),
    calls: Type.Integer({ minimum: 0, maximum: 12 }),
    applied: Type.Array(mindName, { uniqueItems: true }),
  }),
  "mind-scene": object({ ...turn, text: mindText }),
  "mind-message": object({ ...turn, to: mindName, text: mindText }),
};
