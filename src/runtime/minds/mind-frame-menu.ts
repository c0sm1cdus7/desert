// Says the menu once: one line per kind of act with its targets, where it runs and its purpose, never its input.
import type { Language } from "../../fields/languages.ts";
import { menuLine } from "../../texts/mind-frame.texts.ts";
import type { MindMenu } from "../../tools/minds/mind-answer.ts";
type Item = MindMenu[number] & Readonly<{ purpose?: string }>;
const unique = (values: readonly string[]) => [...new Set(values)];
/** The items of one kind, as the answer schema groups them: the same act with the same input. */
function kinds(menu: readonly Item[]): Item[][] {
  const groups = new Map<string, Item[]>();
  for (const item of menu) {
    const key = JSON.stringify([item.act, item.input]);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()];
}
export function menuItemLine(items: readonly Item[], language: Language, show = (id: string) => id): string {
  const [first] = items;
  if (!first) return "";
  const destinations = items.flatMap(item => item.destinations ?? []);
  return menuLine.text(language, {
    act: first.act,
    targets: unique(items.map(item => show(item.target))).join(", "),
    house: destinations.some(each => each.kind === "house"),
    devices: unique(destinations.flatMap(each => (each.kind === "device" ? [each.device] : []))).join(", "),
    purpose: first.purpose ?? "",
  });
}
export function menuText(menu: readonly Item[], language: Language, show?: (id: string) => string): string {
  return kinds(menu)
    .map(items => menuItemLine(items, language, show))
    .join("\n");
}
