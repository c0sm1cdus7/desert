// Publica esquemas de actos propios y controles de journeys para condiciones del catálogo del core.
import type { TSchema } from "@sinclair/typebox";
import { communicationInputs } from "../minds/communication-inputs.ts";
import { actCatalog } from "../../house/own-acts.ts";
import { journeyInputs } from "../minds/journey-menu.ts";
const own: Readonly<Record<string, Readonly<{ input: TSchema }>>> = actCatalog;
const communication: Readonly<Record<string, TSchema>> = communicationInputs;
const journeys: Readonly<Record<string, TSchema>> = journeyInputs;
export function coreRuleSchema(tool: string, act: string): TSchema | undefined {
  if (tool === "mind") return Object.hasOwn(communication, act) ? communication[act] : undefined;
  if (tool === "me") return Object.hasOwn(own, act) ? own[act]?.input : undefined;
  if (tool === "journey") return Object.hasOwn(journeys, act) ? journeys[act] : undefined;
  return undefined;
}
