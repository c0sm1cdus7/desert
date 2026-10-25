// The props of Menu: the accessible `label` and `icon` of its trigger, the `actions` it reveals (each read by its label
// beside an icon action), whether it is `open`, and the trigger edge it aligns to. It emits `openchange` with the state
// the person asks for, and `invoke` with the intent of the action they choose (the menu closes first). A bar's menu
// (`bar: "command"`) makes its trigger one of the bar's commands.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { ActionIconSchema } from "../../../../interaction/action-icon.ts";
import { ToolbarActionSchema } from "../../../../interaction/toolbar.ts";
import { SurfaceIntentSchema } from "../../../../interaction/intent.ts";

export const MenuContract = {
  props: Type.Object({
    label: text,
    icon: ActionIconSchema,
    actions: Type.Array(ToolbarActionSchema),
    open: Type.Boolean(),
    align: Type.Literal("end"),
    bar: Type.Optional(Type.Literal("command")),
  }, { additionalProperties: false }),
  events: Type.Object({ openchange: Type.Boolean(), invoke: SurfaceIntentSchema }, { additionalProperties: false }),
  marks: ["data-menu-action"],
} as const;
