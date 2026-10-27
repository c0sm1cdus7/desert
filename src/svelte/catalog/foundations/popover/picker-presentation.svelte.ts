// Popover part: whether an adaptive popover anchors its picker beside the trigger or presents it as a modal sheet.
// Anchoring needs room for the picker and readable surrounding context, measured on the launching host.
import { useSurfaceHost } from "../../mechanisms/surface-host/surface-host.svelte.ts";
import { PICKER_PANEL_REM } from "../../../infra/picker-measure.ts";

const VISIBLE_CONTEXT_REM = 4;
/** The inline measure (rem) and the block room (rem) a picker needs to stay anchored. */
export type PickerBudget = Readonly<{ panelRem: number; minimumBlockRem: number }>;
export const pickerBudget: PickerBudget = { panelRem: PICKER_PANEL_REM, minimumBlockRem: 0 };
/** A month calendar: six week rows plus month controls, the field and collision margins must fit. */
export const calendarBudget: PickerBudget = { panelRem: 20, minimumBlockRem: 28 };

export class PickerPresentation {
  #host = useSurfaceHost();
  #budget: () => PickerBudget;
  constructor(budget: () => PickerBudget) { this.#budget = budget; }
  get current(): "anchored" | "sheet" {
    const { panelRem, minimumBlockRem } = this.#budget();
    const anchoredBudget = (panelRem + VISIBLE_CONTEXT_REM) * this.#host.textSize;
    return this.#host.availableInline >= anchoredBudget
      && this.#host.availableBlock >= minimumBlockRem * this.#host.textSize ? "anchored" : "sheet";
  }
}
