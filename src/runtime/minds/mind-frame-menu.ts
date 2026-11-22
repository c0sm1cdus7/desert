// Says the menu once: one line per kind of act with its targets, where it runs and its purpose, never its input.
import type { Language } from "../../fields/languages.ts";
import { frameReading, menuLine } from "../../texts/mind-frame.texts.ts";
import { readAct } from "./mind-read.ts";
import type { MindMenu } from "../../tools/minds/mind-answer.ts";
type Item = MindMenu[number] & Readonly<{ purpose?: string }>;
const unique = (values: readonly string[]) => [...new Set(values)];
/** The items of one kind, as the answer schema groups them: the same act with the same input. */
function kinds(menu: readonly Item[]): Item[][] {
  const groups = new Map<string, Item[]>();
  for (const item of menu) {
    const key = JSON.stringify([item.tool, item.act, item.input, !item.destinations]);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()];
}
/** The targets of one kind as the menu says them: the read act's and any open journey other than the scope's own are
 * said in words, so the cached menu stays the same while journeys open and close; their ids are in Contexto. */
function targetsOf(items: readonly Item[], language: Language, own: string | undefined): string[] {
  const words = (part: "targets" | "journeys") => frameReading.text(language, { part, count: 0, id: "" });
  if (items[0]?.act === readAct) return [words("targets")];
  return items.map(item =>
    item.target.startsWith("journey:") && item.target !== own ? words("journeys") : item.target,
  );
}
export function menuItemLine(items: readonly Item[], language: Language, own?: string): string {
  const [first] = items;
  if (!first) return "";
  const destinations = items.flatMap(item => item.destinations ?? []);
  const targets = targetsOf(items, language, own);
  return menuLine.text(language, {
    act: first.act,
    targets: unique(targets).join(", "),
    house: destinations.some(each => each.kind === "house"),
    devices: unique(destinations.flatMap(each => (each.kind === "device" ? [each.device] : []))).join(", "),
    purpose: first.purpose ?? "",
  });
}
export function menuText(menu: readonly Item[], language: Language, own?: string): string {
  return kinds(menu)
    .map(items => menuItemLine(items, language, own))
    .join("\n");
}
