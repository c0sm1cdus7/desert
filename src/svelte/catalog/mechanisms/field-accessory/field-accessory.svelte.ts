// Mechanism field-accessory (owned by field): the well's trailing accessory slot tells the Action it holds that it is a
// field accessory. The Action then fills the slot's inset box, square, with the well's radius less that inset.
import { getContext, setContext } from "svelte";

const accessoryKey = Symbol("desert.field-accessory");

/** Marks what renders below as the content of a field's trailing accessory. */
export function provideFieldAccessory(): void { setContext(accessoryKey, true); }

/** Whether the calling piece renders inside a field's trailing accessory. */
export function inFieldAccessory(): boolean { return getContext<boolean | undefined>(accessoryKey) === true; }
