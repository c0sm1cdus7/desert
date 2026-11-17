// Declara reservas, envíos, liquidaciones e incertidumbre de llamadas sin contener llaves.
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { wholeNumber } from "../../fields/json-values.ts";
import { mindName } from "../assistants/assistant-facts.ts";
const call = { call: mindName };
export const modelCallFacts = {
  "model-call-reserved": object({
    ...call,
    turn: mindName,
    account: mindName,
    number: Type.Integer({ minimum: 1, maximum: 12 }),
    maximumNanoUsd: wholeNumber,
  }),
  "model-call-started": object(call),
  "model-call-settled": object({
    ...call,
    actualNanoUsd: wholeNumber,
    usage: object({ input: wholeNumber, cacheWrite: wholeNumber, cacheRead: wholeNumber, output: wholeNumber }),
  }),
  "model-call-uncertain": object(call),
  "model-call-cancelled": object(call),
};
