// The props of Surface. `kind` (DESIGN §1.6 calls it `role`, a name rule E reserves for ARIA) says which surface it
// is: the `main` content place of a workspace (its scroll viewport, hidden from interaction while `searching`), the `navigation` pane, a `frame` (a panel or dialog: the host its
// transients size against, presented as `presentation`, wrapping a `form` when it has one: its accessible `label` and the
// `id` a bar's submit command names), or the `page` an access
// experience fills over a `backdrop` wallpaper. `label` names it; `destination` marks a main place's destination.
// `composition` reports text composition inside a place; `submit` is the form's submission. A caller that binds it
// scrolls its viewport through the instance (scrollToTop, scrollTop, scrollTo) instead of holding its elements.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const SurfaceContract = {
  props: Type.Object({
    kind: Type.Union([Type.Literal("main"), Type.Literal("navigation"), Type.Literal("frame"), Type.Literal("page")]),
    label: Type.Optional(text),
    destination: Type.Optional(Type.String()),
    searching: Type.Boolean(),
    presentation: Type.Optional(Type.Union([Type.Literal("standard"), Type.Literal("message"), Type.Literal("transient")])),
    backdrop: Type.Optional(Type.Union([Type.Literal("silk"), Type.Literal("mist"), Type.Literal("plain")])),
    form: Type.Optional(Type.Object({ label: text, id: Type.String({ minLength: 1 }) }, { additionalProperties: false })),
  }, { additionalProperties: false }),
  events: Type.Object({
    composition: Type.Boolean(),
    submit: Type.Void(),
  }, { additionalProperties: false }),
  instance: Type.Object({
    scrollToTop: Type.Function([], Type.Void()),
    scrollTop: Type.Function([], Type.Number()),
    scrollTo: Type.Function([Type.Number()], Type.Void()),
  }, { additionalProperties: false }),
  marks: ["data-scroll-owner", "data-surface-frame", "data-frame-presentation", "data-surface-slot", "data-catalog-scroll",
    "data-catalog-content", "data-surface", "data-surface-backdrop", "data-surface-page-top", "data-surface-page-content"],
} as const;
