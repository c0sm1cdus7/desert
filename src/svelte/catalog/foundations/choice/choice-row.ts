// The one row geometry of a choice, shared by the rows of a pane (a label around a radio or checkbox) and the options
// of a menu (a listbox option): full width, 44px tall, the group's radius at the ends, a divider inset past the mark.
// Literal class names, so the theme's Tailwind scan sees them; the press feedback is the theme's (today `tm-control`).
import { Value } from "@sinclair/typebox/value";
import { SwatchOptionSchema, type ChoiceOption, type SwatchOption } from "../../../../interaction/choice.ts";

// F1-merge: utility control-feedback replaces tm-control.
export const rowFrame = "tm-control relative flex w-full min-w-0 min-h-11 p-0 m-0 border-none rounded-none bg-transparent shadow-none "
  + "cursor-pointer font-normal text-start first:rounded-ss-[var(--radius-group)] first:rounded-se-[var(--radius-group)] "
  + "last:rounded-es-[var(--radius-group)] last:rounded-ee-[var(--radius-group)] aria-disabled:cursor-default "
  + "focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-3 focus-visible:shadow-none "
  + "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring has-[:focus-visible]:-outline-offset-3 has-[:focus-visible]:shadow-none";
/** Every row after the first draws the divider above it, from past the selection mark to the trailing inset. */
export const rowDivider = "before:absolute before:content-[''] before:top-0 before:start-10 before:end-4 before:h-px before:bg-separator "
  + "before:pointer-events-none";
/** The rows inside one group: a column without gaps that keeps its pane's radius. */
export const rowGroup = "flex w-full min-w-0 flex-col gap-0 rounded-[inherit]";

/** The menu's trigger presentation: the contract gives it exactly when the presentation is a menu. */
export function menuTriggerOf<T extends string>(trigger: T | undefined): T {
  if (trigger === undefined) throw new Error("CHOICE_CONTRACT: a menu has a menuTrigger; contract: choice");
  return trigger;
}

/** Swatch options: the contract gives each a tint, which is what a swatch paints. */
export function swatchesOf(options: readonly ChoiceOption[]): readonly SwatchOption[] {
  return options.map(option => {
    if (!Value.Check(SwatchOptionSchema, option)) throw new Error(`CHOICE_CONTRACT: swatch ${option.value} leads with a tint; contract: choice`);
    return option;
  });
}
