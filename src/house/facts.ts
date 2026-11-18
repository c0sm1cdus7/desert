// The house fact catalog, typed emissions and effects, including the legacy catalog for saved records.
import { selectionKitSchema } from "./kit-selection.ts";
import { name, preference, scene, t, toolLimits } from "./own-acts.ts";
import { wholeNumber } from "../fields/json-values.ts";
import { Type } from "@sinclair/typebox";
import { object } from "../fields/visible-text.ts";
import type { Facts, Position, Catalog, Layer } from "../journal/vocabulary.ts";

import { assistantFacts } from "./assistants/assistant-facts.ts";
import { journeyFacts } from "./minds/journey-facts.ts";
import { mindFacts } from "./minds/mind-facts.ts";
import { mindSettingsFacts } from "./minds/mind-settings.ts";
import { modelCallFacts } from "./minds/model-call-facts.ts";
const literals = <T extends string>(...values: T[]) => Type.Union(values.map(value => Type.Literal(value)));
const text = Type.String();

export const names = Type.Array(name);

const actStatus = literals("accepted", "rejected", "draft", "inconclusive", "interrupted");
/** The new mind facts stay after existing facts in validation, without changing their schemas. */
export const mindHouseCatalog = {
  ...assistantFacts,
  ...journeyFacts,
  ...mindFacts,
  ...mindSettingsFacts,
  ...modelCallFacts,
};
/** What every house writes, whatever program lives in it. */
export const houseCatalog = {
  "house-created": object({}),
  granted: Type.Union([
    object({ identity: name, tools: names }),
    object({ version: Type.Literal(2), identity: name, kit: selectionKitSchema }),
  ]),
  named: object({ identity: name, name: t(toolLimits.text) }),
  /** Someone leaves the house: from then on nothing of it is theirs. Only who administers it says so. */
  removed: object({ identity: name }),
  /** The house passes to another of those who are in it: from then on that one administers it. */
  handed: object({ to: name }),
  preferred: preference,
  scene,
  "kit-set": Type.Union([
    object({ holder: name, tool: name, acts: Type.Union([names, Type.Null()]) }),
    object({ version: Type.Literal(2), holder: name, kit: selectionKitSchema }),
  ]),
  boot: object({}),
  act: object({
    object: name,
    option: name,
    input: Type.Unknown(),
    through: Type.Optional(wholeNumber),
    reaction: Type.Optional(object({ id: name, notice: name })),
  }),
  "act-started": object({ act: name, object: name, option: name }),
  "act-result": object({
    act: name,
    status: actStatus,
    reason: text,
    defect: Type.Optional(Type.Literal(true)),
    output: Type.Optional(Type.Boolean()),
  }),
  "tool-entry": object({
    tool: name,
    target: name,
    author: name,
    text,
    draft: Type.Optional(Type.Boolean()),
    attention: Type.Optional(Type.Boolean()),
    silent: Type.Optional(Type.Boolean()),
    detail: Type.Optional(Type.Unknown()),
    diagnostic: Type.Optional(text),
    /** The things that were not there before the act and are there after it: what it made, besides its target. */
    made: Type.Optional(Type.Array(name)),
  }),
  "act-done": object({ object: name, act: name, text }),
  attended: object({ target: name }),
  unattended: object({ target: name }),
  attention: object({ tool: name, delay: Type.Union([wholeNumber, Type.Null()]) }),
  stimulus: object({ tool: name }),
  "wake-at": object({ id: name, at: Type.Union([wholeNumber, Type.Null()]) }),
  woke: object({ id: name }),
  ...mindHouseCatalog,
};
/** Only version two may cross the writer boundary; the reader retains both shapes. */
export const currentHouseCatalog = {
  ...houseCatalog,
  granted: houseCatalog.granted.anyOf[1],
  "kit-set": houseCatalog["kit-set"].anyOf[1],
  "assistant-kit-set": assistantFacts["assistant-kit-set"].anyOf[1],
  "journey-opened": journeyFacts["journey-opened"].anyOf[1],
};
export type HouseKind = keyof typeof houseCatalog;
export type HouseEmission<K extends HouseKind = HouseKind> = Extract<Facts<typeof houseCatalog, "house">, { kind: K }>;
export type HouseEvent<K extends HouseKind = HouseKind> = HouseEmission<K> & Position;
export const origin = (by: string, cause: readonly string[], process?: string) => ({
  by,
  cause,
  ...(process ? { process } : {}),
});
export const effect = <K extends HouseKind>(
  kind: K,
  data: HouseEmission<K>["data"],
  by: string,
  cause: readonly string[] = [],
  process?: string,
) => ({ layer: "house" as const, kind, data, ...origin(by, cause, process) });
/** The one compatibility boundary for records written before shared house reading. */
export const legacyHouseCatalog = {
  "channel-created": object({ channel: name, members: names }),
  "tool-entry": object({
    tool: name,
    target: name,
    author: name,
    text,
    draft: Type.Optional(Type.Boolean()),
    attention: Type.Optional(Type.Boolean()),
    silent: Type.Optional(Type.Boolean()),
    recipient: Type.Optional(name),
    detail: Type.Optional(Type.Unknown()),
    diagnostic: Type.Optional(text),
    made: Type.Optional(Type.Array(name)),
  }),
  "act-done": object({ object: name, act: name, text, recipient: Type.Optional(name) }),
} satisfies Catalog;
export const layerOf = (kind: string): Layer =>
  Object.hasOwn(houseCatalog, kind) || Object.hasOwn(legacyHouseCatalog, kind) ? "house" : "program";

export { name } from "./own-acts.ts";
