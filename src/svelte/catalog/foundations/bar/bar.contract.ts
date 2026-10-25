// The props of Bar, the toolbar of a surface (DESIGN §3.2). `edge` and `purpose` place it: top `commands` (identity,
// leading navigation, trailing commands with overflow, the top primary), bottom `commit` or `steps` (secondary and
// primary as text actions), or `navigation` (the navigation pane's identity, toggle and settings placeholder).
// `identityRole` says what the identity is: the surface `heading`, a `continuation` echoing a heading that scrolled
// away, or the title of a `dialog` or `message`. `search` is the place search: a `layer: "search"` bar draws the field
// and its toggle; a `layer: "content"` bar only reserves the toggle's room. `inert` takes the bar out of interaction
// (its content layer while searching). Commands are invoked by intent; search and the navigation toggle raise events.
// `controls` are commands local to the surface that are no surface intent (the media viewer's zoom): a top command rail
// draws them after its identity and raises `control` with the id pressed. A caller that binds the bar moves focus to its
// leading command (`focusLeading`, the media viewer's Close on opening).
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { FaceSchema } from "../../../../interaction/face.ts";
import { SurfaceIntentSchema } from "../../../../interaction/intent.ts";
import { BarCommandSchema, BarControlSchema } from "../../../infra/bar-command.ts";

export const BarContract = {
  props: Type.Object({
    edge: Type.Union([Type.Literal("top"), Type.Literal("bottom")]),
    purpose: Type.Union([Type.Literal("commands"), Type.Literal("commit"), Type.Literal("steps"), Type.Literal("navigation")]),
    identity: Type.Optional(Type.Object({ title: text, subtitle: Type.Optional(text) }, { additionalProperties: false })),
    identityRole: Type.Union([Type.Literal("heading"), Type.Literal("continuation"), Type.Literal("dialog"), Type.Literal("message")]),
    face: Type.Optional(FaceSchema),
    leading: Type.Optional(BarCommandSchema),
    trailing: Type.Array(BarCommandSchema),
    controls: Type.Optional(Type.Array(BarControlSchema)),
    group: Type.Optional(Type.Literal("create")),
    primary: Type.Optional(BarCommandSchema),
    secondary: Type.Optional(BarCommandSchema),
    availability: Type.Optional(Type.Object({
      state: Type.Union([Type.Literal("ready"), Type.Literal("unknown"), Type.Literal("unavailable")]), label: text,
    }, { additionalProperties: false })),
    search: Type.Optional(Type.Object({ title: text, query: Type.String(), open: Type.Boolean(), resultsId: Type.String() },
      { additionalProperties: false })),
    navigationToggle: Type.Optional(Type.Object({ expanded: Type.Boolean(), controls: Type.String() }, { additionalProperties: false })),
    settingsPlaceholder: Type.Boolean(),
    layer: Type.Optional(Type.Union([Type.Literal("content"), Type.Literal("search")])),
    inert: Type.Boolean(),
  }, { additionalProperties: false }),
  events: Type.Object({
    invoke: SurfaceIntentSchema,
    query: Type.String(),
    searchopen: Type.Void(),
    searchcancel: Type.Void(),
    navigationtoggle: Type.Void(),
    control: Type.String(),
  }, { additionalProperties: false }),
  instance: Type.Object({ focusLeading: Type.Function([], Type.Boolean()) }, { additionalProperties: false }),
  marks: ["data-toolbar", "data-toolbar-identity", "data-identity-role", "data-search-toggle", "data-toolbar-controls", "data-frame-edge"],
} as const;
