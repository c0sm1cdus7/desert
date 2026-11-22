// What the screen door sends and takes: closed schemas built on the contract's wire, each parsed without throwing.
import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { parseIntent, WireIntent, WireScreen } from "../../surface/contract/wire.ts";
import { screenLimits } from "./screen-limits.ts";

const closed = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
/** Why the door did not apply what a client sent: its own reasons, then the reasons an intent is not one. */
const refusals = ["shape", "epoch", "client", "gap", "old", "stale"] as const;
const intentRefusals = ["kind", "type-length", "type-control", "paste-length"] as const;
export const WireRefusal = Type.Union([...refusals, ...intentRefusals].map(reason => Type.Literal(reason)));
export type WireRefusal = Static<typeof WireRefusal>;
type IntentRefusal = Extract<ReturnType<typeof parseIntent>, { ok: false }>["reason"];
// Every reason parseIntent gives is a reason a frame can carry: one more there does not compile here.
const everyIntentRefusal: [Exclude<IntentRefusal, WireRefusal>] extends [never] ? true : false = true;
export const WireViewport = closed({ rows: Type.Integer({ minimum: 1, maximum: screenLimits.rows }) });
/** What the door sends: the screen for this client, and where it stands in the order. */
export const WireFrame = closed({
  v: Type.Literal(1),
  /** One per router: a new router is a new epoch. */
  epoch: Type.String(),
  /** One per attached client (a tab, a phone): given by the door at its first look. */
  client: Type.String(),
  /** The last batch of this client the door applied. */
  seq: Type.Integer({ minimum: 0 }),
  /** Counts the screens sent to this client that differed from the one before. */
  rev: Type.Integer({ minimum: 1 }),
  screen: WireScreen,
  refused: Type.Optional(WireRefusal),
});
export type Frame = Static<typeof WireFrame>;
/** What a person did: a batch of intents, numbered per client and epoch from 1, over the screen they looked at. */
export const WireSend = closed({
  epoch: Type.String(),
  client: Type.String(),
  seq: Type.Integer({ minimum: 1 }),
  /** The rev of the frame the person was looking at. */
  rev: Type.Integer({ minimum: 1 }),
  intents: Type.Array(WireIntent, { minItems: 1, maxItems: screenLimits.batch }),
});
export type Send = Static<typeof WireSend>;
/** Who is looking and how much room they have; a client with no id yet gets one in the frame. */
export const WireLook = closed({
  client: Type.Optional(Type.String()),
  visible: Type.Boolean(),
  viewport: WireViewport,
});
export type Look = Static<typeof WireLook>;
export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: WireRefusal };
const refused = <T>(reason: WireRefusal): Parsed<T> => ({ ok: false, reason });
/** A frame as a client received it, or why it is not one. */
export const parseFrame = (value: unknown): Parsed<Frame> =>
  Value.Check(WireFrame, value) ? { ok: true, value } : refused("shape");
/** A look as the door received it, or why it is not one. */
export const parseLook = (value: unknown): Parsed<Look> =>
  Value.Check(WireLook, value) ? { ok: true, value } : refused("shape");
/** A batch as the door received it, or why it is not one: an intent that is not one says its own reason. */
export function parseSend(value: unknown): Parsed<Send> {
  const intents: unknown = typeof value === "object" && value !== null && "intents" in value ? value.intents : [];
  for (const intent of Array.isArray(intents) ? intents : []) {
    const parsed = parseIntent(intent);
    if (!parsed.ok) return refused(parsed.reason);
  }
  return Value.Check(WireSend, value) ? { ok: true, value } : refused("shape");
}
/** The proof above, kept where the compiler reads it. */
export const wireRefusalsCovered = everyIntentRefusal;
