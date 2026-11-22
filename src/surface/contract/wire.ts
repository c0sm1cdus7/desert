// The Screen and the Intent as they travel: closed schemas, a screen built field by field, an intent checked on entry.
import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Attachment, Body, Hint, Intent, Panel, Row, Screen, Span, Stack, ThreadEvent } from "./contract.ts";
import { pasteLimit } from "./limits.ts";

const closed = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const count = Type.Integer({ minimum: 0 });
const tones = ["bg", "t1", "t2", "t3", "line", "being", "ok", "wait", "cut", "d1", "d2", "d3", "d4", "d5"] as const;
const hintKeys = ["move", "confirm", "cancel", "mark", "switch", "full", "find"] as const;
const states = ["connected", "connecting", "signal-lost", "disconnected"] as const;
const WireTone = Type.Union(tones.map(tone => Type.Literal(tone)));
const WireSpan = closed({
  text: Type.String(),
  tone: WireTone,
  bold: Type.Optional(Type.Boolean()),
  rgb: Type.Optional(closed({ fg: Type.Optional(Type.String()), bg: Type.Optional(Type.String()) })),
});
const WireLine = Type.Array(WireSpan);
const WireHint = closed({ intent: Type.Union(hintKeys.map(key => Type.Literal(key))), does: Type.String() });
const WireRow = closed({
  key: Type.Optional(Type.String()),
  title: Type.String(),
  detail: Type.Optional(Type.String()),
  tone: Type.Optional(WireTone),
  selected: Type.Optional(Type.Boolean()),
  still: Type.Optional(Type.Boolean()),
  off: Type.Optional(Type.Boolean()),
  entry: Type.Optional(closed({ typed: Type.String(), caret: count })),
  spans: Type.Optional(WireLine),
});
const WireStack = closed({
  title: Type.String(),
  empty: Type.Optional(Type.String()),
  reads: Type.Optional(Type.Literal(true)),
  rows: Type.Array(WireRow),
  above: Type.Optional(count),
  below: Type.Optional(count),
});
const WireAttachment = closed({ title: Type.String(), detail: Type.String(), selected: Type.Optional(Type.Boolean()) });
const WireEvent = closed({
  head: Type.Optional(WireLine),
  quote: Type.Optional(Type.String()),
  text: WireLine,
  attachments: Type.Optional(Type.Array(WireAttachment)),
  selected: Type.Optional(Type.Boolean()),
  nested: Type.Optional(Type.Boolean()),
  ignored: Type.Optional(Type.Literal(true)),
  muted: Type.Optional(Type.Boolean()),
});
const WireEntry = closed({
  typed: Type.String(),
  caret: count,
  placeholder: Type.String(),
  suggested: Type.Optional(Type.Literal(true)),
  remaining: Type.Optional(Type.String()),
  padding: Type.Optional(count),
});
const WireThread = closed({
  kind: Type.Literal("thread"),
  events: Type.Array(WireEvent),
  options: Type.Optional(Type.Array(WireRow)),
  more: Type.Optional(closed({ above: count, below: count })),
  entry: Type.Optional(WireEntry),
  reference: Type.Optional(Type.String()),
  read: Type.Optional(count),
});
const WireBody = Type.Union([
  closed({ kind: Type.Literal("list"), stacks: Type.Array(WireStack) }),
  closed({ kind: Type.Literal("focus"), title: Type.String(), lines: Type.Array(WireLine) }),
  WireThread,
]);
const WirePanel = closed({
  title: Type.String(),
  detail: Type.Optional(Type.String()),
  lines: Type.Array(WireLine),
  focused: Type.Boolean(),
  full: Type.Boolean(),
  top: count,
});
/** A Screen and nothing else: every object closed, so a field the contract does not name never travels. */
export const WireScreen = closed({
  title: Type.String(),
  state: Type.Union(states.map(state => Type.Literal(state))),
  clock: Type.String(),
  battery: Type.Optional(Type.String()),
  body: WireBody,
  panel: Type.Optional(WirePanel),
  hints: Type.Array(WireHint),
  menu: Type.Boolean(),
});
export type WireScreen = Static<typeof WireScreen>;

/** Exactly the same type: what mutual assignability is not, since an optional field one side lacks still assigns. */
type Same<A, B> = (<T>(value: T) => T extends A ? 1 : 2) extends <T>(value: T) => T extends B ? 1 : 2 ? true : false;
type Deep<T> = T extends readonly (infer E)[]
  ? readonly Deep<E>[]
  : T extends object
    ? { readonly [K in keyof T]: Deep<T[K]> }
    : T;
// The schemas and the contract are one shape, optional fields included: a field on one side only does not compile.
const sameShape: Same<Deep<WireScreen>, Deep<Screen>> = true;
const sameIntent: Same<Deep<WireIntent>, Deep<Intent>> = true;
/** Both proofs: this file does not compile while either of them is false. */
export const wireMatchesContract = { screen: sameShape, intent: sameIntent } as const;

const spanOf = (from: Span): Static<typeof WireSpan> => {
  const to: Static<typeof WireSpan> = { text: from.text, tone: from.tone };
  if (from.bold !== undefined) to.bold = from.bold;
  if (from.rgb !== undefined) {
    const rgb: NonNullable<Static<typeof WireSpan>["rgb"]> = {};
    if (from.rgb.fg !== undefined) rgb.fg = from.rgb.fg;
    if (from.rgb.bg !== undefined) rgb.bg = from.rgb.bg;
    to.rgb = rgb;
  }
  return to;
};
const lineOf = (line: readonly Span[]): Static<typeof WireLine> => line.map(spanOf);
const hintOf = (from: Hint): Static<typeof WireHint> => ({ intent: from.intent, does: from.does });
function rowOf(from: Row): Static<typeof WireRow> {
  const to: Static<typeof WireRow> = { title: from.title };
  if (from.key !== undefined) to.key = from.key;
  if (from.detail !== undefined) to.detail = from.detail;
  if (from.tone !== undefined) to.tone = from.tone;
  if (from.selected !== undefined) to.selected = from.selected;
  if (from.still !== undefined) to.still = from.still;
  if (from.off !== undefined) to.off = from.off;
  if (from.entry !== undefined) to.entry = { typed: from.entry.typed, caret: from.entry.caret };
  if (from.spans !== undefined) to.spans = lineOf(from.spans);
  return to;
}
function stackOf(from: Stack): Static<typeof WireStack> {
  const to: Static<typeof WireStack> = { title: from.title, rows: from.rows.map(rowOf) };
  if (from.empty !== undefined) to.empty = from.empty;
  if (from.reads !== undefined) to.reads = from.reads;
  if (from.above !== undefined) to.above = from.above;
  if (from.below !== undefined) to.below = from.below;
  return to;
}
function attachmentOf(from: Attachment): Static<typeof WireAttachment> {
  const to: Static<typeof WireAttachment> = { title: from.title, detail: from.detail };
  if (from.selected !== undefined) to.selected = from.selected;
  return to;
}
function eventOf(from: ThreadEvent): Static<typeof WireEvent> {
  const to: Static<typeof WireEvent> = { text: lineOf(from.text) };
  if (from.head !== undefined) to.head = lineOf(from.head);
  if (from.quote !== undefined) to.quote = from.quote;
  if (from.attachments !== undefined) to.attachments = from.attachments.map(attachmentOf);
  if (from.selected !== undefined) to.selected = from.selected;
  if (from.nested !== undefined) to.nested = from.nested;
  if (from.ignored !== undefined) to.ignored = from.ignored;
  if (from.muted !== undefined) to.muted = from.muted;
  return to;
}
type Thread = Extract<Body, { kind: "thread" }>;
function entryOf(from: NonNullable<Thread["entry"]>): Static<typeof WireEntry> {
  const to: Static<typeof WireEntry> = { typed: from.typed, caret: from.caret, placeholder: from.placeholder };
  if (from.suggested !== undefined) to.suggested = from.suggested;
  if (from.remaining !== undefined) to.remaining = from.remaining;
  if (from.padding !== undefined) to.padding = from.padding;
  return to;
}
function threadOf(from: Thread): Static<typeof WireThread> {
  const to: Static<typeof WireThread> = { kind: "thread", events: from.events.map(eventOf) };
  if (from.options !== undefined) to.options = from.options.map(rowOf);
  if (from.more !== undefined) to.more = { above: from.more.above, below: from.more.below };
  if (from.entry !== undefined) to.entry = entryOf(from.entry);
  if (from.reference !== undefined) to.reference = from.reference;
  if (from.read !== undefined) to.read = from.read;
  return to;
}
function bodyOf(from: Body): Static<typeof WireBody> {
  if (from.kind === "list") return { kind: "list", stacks: from.stacks.map(stackOf) };
  if (from.kind === "focus") return { kind: "focus", title: from.title, lines: from.lines.map(lineOf) };
  return threadOf(from);
}
function panelOf(from: Panel): Static<typeof WirePanel> {
  const lines = from.lines.map(lineOf);
  const to: Static<typeof WirePanel> = {
    title: from.title,
    lines,
    focused: from.focused,
    full: from.full,
    top: from.top,
  };
  if (from.detail !== undefined) to.detail = from.detail;
  return to;
}
/** The screen as it travels, built field by field: what the contract does not name is never copied. */
export function wire(screen: Screen): WireScreen {
  const to: WireScreen = {
    title: screen.title,
    state: screen.state,
    clock: screen.clock,
    body: bodyOf(screen.body),
    hints: screen.hints.map(hintOf),
    menu: screen.menu,
  };
  if (screen.battery !== undefined) to.battery = screen.battery;
  if (screen.panel !== undefined) to.panel = panelOf(screen.panel);
  return to;
}
const keyKinds = ["up", "down", "left", "right", "confirm", "cancel", "erase", "menu", "quit", "switch"] as const;
/** The twelve intents and nothing else. */
export const WireIntent = Type.Union([
  closed({ kind: Type.Union(keyKinds.map(kind => Type.Literal(kind))) }),
  closed({ kind: Type.Literal("type"), text: Type.String() }),
  closed({ kind: Type.Literal("paste"), text: Type.String() }),
]);
export type WireIntent = Static<typeof WireIntent>;
const kinds: ReadonlySet<unknown> = new Set([...keyKinds, "type", "paste"]);
/** Why an intent that arrived is not one: its shape, its kind, a key that is not one key, a paste too long. */
type IntentRefusal = "shape" | "kind" | "type-length" | "type-control" | "paste-length";
type Parsed = { readonly ok: true; readonly intent: Intent } | { readonly ok: false; readonly reason: IntentRefusal };
const refused = (reason: IntentRefusal): Parsed => ({ ok: false, reason });
/** What a door received, as an intent, or why it is not one: a key is one character, a paste has its limit. */
export function parseIntent(value: unknown): Parsed {
  if (typeof value !== "object" || value === null || !("kind" in value)) return refused("shape");
  if (!kinds.has(value.kind)) return refused(typeof value.kind === "string" ? "kind" : "shape");
  if (!Value.Check(WireIntent, value)) return refused("shape");
  if (value.kind === "type" && Array.from(value.text).length !== 1) return refused("type-length");
  if (value.kind === "type" && /\p{Cc}/u.test(value.text)) return refused("type-control");
  if (value.kind === "paste" && value.text.length > pasteLimit) return refused("paste-length");
  return { ok: true, intent: value };
}
