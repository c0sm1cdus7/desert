// Surface focus: one owner moves focus into a transient surface when it opens and back to its opener when it closes,
// across portalled descendants. Owned by modal; popover, date-control and choice list it in owner.mechanisms (design §2).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const SurfaceFocusMechanism = defineMechanism({ id: "surface-focus", owner: "modal", files: ["surface-focus.svelte.ts", "focus-return.ts"] } as const);
