import type { ExtendedNode, ExtendedEvent, OptionsNode } from "./extended-nodes.ts";
import { inputMask } from "./input-mask.ts";

/** Cardinality belongs to the value, not to a journey. Contextual commands never
 * become required inputs merely because they retain at least one selection. */
export function optionsInputRequired(node: OptionsNode): boolean {
  return node.inputRequired === true && node.minSelected > 0 &&
    (node.maxSelected !== 1 || node.selected.length === 0);
}

/** The view and reducer ask this same law before offering or accepting an edit.
 * Requiredness is validation, not an editing lock: incomplete drafts remain legal. */
export function permitsOptionsSelection(node: OptionsNode, selected: readonly string[]): boolean {
  return !node.disabled && new Set(selected).size === selected.length && selected.length <= node.maxSelected &&
    selected.every(value => node.options.some(option => option.value === value && (!option.disabled || node.selected.includes(value)))) &&
    node.options.every(option => !option.disabled || node.selected.includes(option.value) === selected.includes(option.value));
}

function validDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const leap = year! % 4 === 0 && (year! % 100 !== 0 || year! % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year! >= 1 && month! >= 1 && month! <= 12 && day! >= 1 && day! <= days[month! - 1]!;
}

export function checkExtendedControl(node: ExtendedNode) {
  if (node.kind === "options") {
    const values = node.options.map(option => option.value);
    if (new Set(values).size !== values.length || node.minSelected > node.maxSelected ||
      node.maxSelected > values.length || node.selected.length > node.maxSelected ||
      node.selected.some(value => !values.includes(value))) throw new Error("INVALID_CONTROL_SELECTION");
  }
  if (node.kind === "money") {
    const codes = node.currencies.map(currency => currency.code);
    if (new Set(codes).size !== codes.length || !codes.includes(node.currency)) throw new Error("INVALID_MONEY_CURRENCY");
    inputMask({ kind: "decimal", locale: node.locale ?? "en-US", scale: node.currencies.find(item => item.code === node.currency)!.scale });
  }
  if (node.kind === "date") {
    if ([node.value, node.minimum, node.maximum].some(value => value != null && !validDate(value)) ||
      (node.minimum && node.maximum && node.minimum > node.maximum) ||
      (node.value && ((node.minimum && node.value < node.minimum) || (node.maximum && node.value > node.maximum)))) {
      throw new Error("INVALID_CALENDAR_DATE");
    }
  }
}

export function changeExtendedControl(node: ExtendedNode, event: ExtendedEvent): ExtendedNode {
  if (node.kind === "options" && event.kind === "options.change") {
    if (!permitsOptionsSelection(node, event.selected)) throw new Error("INVALID_CONTROL_EVENT");
    return { ...node, selected: event.selected };
  }
  if (node.kind === "money" && event.kind === "money.change") return { ...node, currency: event.currency, minorUnits: event.minorUnits };
  if (node.kind === "date" && event.kind === "date.change") return { ...node, value: event.value };
  throw new Error("INVALID_CONTROL_EVENT");
}
