// Field accessory: a Field tells the Action its caller places in the well's trailing accessory (the lock screen's unlock)
// that it sits there, so the Action draws its own concentric placement (law 9d) and no stylesheet styles another's marks.
// Owned by field; action lists it in owner.mechanisms.
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const FieldAccessoryMechanism = defineMechanism({ id: "field-accessory", owner: "field", files: ["field-accessory.svelte.ts"] } as const);
