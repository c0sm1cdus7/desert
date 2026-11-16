import { name, preference, scene, t, toolLimits } from "./own-acts.ts";
import { wholeNumber } from "../fields/json-values.ts";
import { Type } from "@sinclair/typebox";
import { object } from "../fields/visible-text.ts";
import type { Facts, Position, Catalog, Layer } from "../journal/vocabulary.ts";

const literals = <T extends string>(...values: T[]) => Type.Union(values.map(value => Type.Literal(value)));
const text = Type.String();

export const names = Type.Array(name);

const actStatus = literals("accepted", "rejected", "draft", "inconclusive", "interrupted");
/** What every house writes, whatever program lives in it. */
export const houseCatalog = {
  "house-created": object({}),
  granted: object({ identity: name, tools: names }),
  named: object({ identity: name, name: t(toolLimits.text) }),
  /** Someone leaves the house: from then on nothing of it is theirs. Only who administers it says so. */
  removed: object({ identity: name }),
  /** The house passes to another of those who are in it: from then on that one administers it. */
  handed: object({ to: name }),
  preferred: preference,
  scene,
  "kit-set": object({ holder: name, tool: name, acts: Type.Union([names, Type.Null()]) }),
  boot: object({}),
  act: object({ object: name, option: name, input: Type.Unknown(), through: Type.Optional(wholeNumber) }),
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
