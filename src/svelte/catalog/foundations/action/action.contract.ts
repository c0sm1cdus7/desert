// The props of Action (design §3.1). `label` is always the accessible name; `face` says what the button shows: `fit` its
// label while it fits and its icon otherwise, `icon` always the icon (toolbars, a field's accessory), `text` always the
// label (a bottom pair, a dialog). `emphasis` is its meaning, `state` whether it can run now and `reason` why not.
// `disclosure` is set only by an overlay (popover, menu, shell) and is pure data: the button's id, the surface it opens,
// whether that surface is open and what kind of popup it is. `form` names the form a submit outside it belongs to.
// `bar` is set only by a bar (and the menu and popover a bar mounts): the Action takes the bar's target, as tall as the
// toolbar target with an inset focus ring; a `command` is square at that target with the bar's inset, a `commit`
// keeps its label on one line and may shrink, a `step` fills its half of the steps row.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { ActionIconSchema } from "../../../../interaction/action-icon.ts";
import { DisclosureSchema } from "../../../infra/disclosure.ts";

export const ActionContract = {
  props: Type.Object({
    label: text,
    icon: ActionIconSchema,
    state: Type.Union([Type.Literal("ready"), Type.Literal("unavailable"), Type.Literal("pending")]),
    emphasis: Type.Union([Type.Literal("primary"), Type.Literal("secondary"), Type.Literal("destructive")]),
    face: Type.Union([Type.Literal("fit"), Type.Literal("icon"), Type.Literal("text")]),
    type: Type.Union([Type.Literal("button"), Type.Literal("submit")]),
    reason: Type.Optional(text),
    form: Type.Optional(Type.String()),
    disclosure: Type.Optional(DisclosureSchema),
    current: Type.Optional(Type.Boolean()),
    bar: Type.Optional(Type.Union([Type.Literal("command"), Type.Literal("commit"), Type.Literal("step")])),
  }, { additionalProperties: false }),
  events: Type.Object({ click: Type.Void() }, { additionalProperties: false }),
  marks: ["data-action", "data-action-face", "data-emphasis"],
} as const;
