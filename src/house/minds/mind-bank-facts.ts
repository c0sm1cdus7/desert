// Keeps the bank's evidence by role, card and exact fingerprints in the house's journal.
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { mindActor } from "../../fields/mind-actor.ts";
import { mindName } from "../assistants/assistant-facts.ts";
export const mindBankFacts = {
  "mind-bank-tested": object({
    mind: mindActor,
    card: mindName,
    version: Type.Union([Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")]),
    result: object({
      role: mindName,
      cases: Type.Integer({ minimum: 1 }),
      scenes: Type.Integer({ minimum: 0 }),
      passed: Type.Boolean(),
      costUsd: Type.Number({ minimum: 0 }),
      seconds: Type.Number({ minimum: 0 }),
      date: mindName,
      fingerprint: object({ cases: mindName, skill: mindName, frameTexts: mindName }),
    }),
  }),
};
