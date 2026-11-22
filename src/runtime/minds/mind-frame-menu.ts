// Says the menu once: one line per kind of act with its targets, where it runs and its purpose, never its input.
import type { Language } from "../../fields/languages.ts";
import { frameReading, menuLine } from "../../texts/mind-frame.texts.ts";
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
function targetsOf(items: readonly Item[], language: Language, own: string | undefined, say: boolean): string[] {
  const words = (part: "targets" | "journeys") => frameReading.text(language, { part, count: 0, id: "" });
  if (items[0]?.tool === "mind" && items[0].scope === "read") return [words("targets")];
  const targets = items.map(item =>
    say && item.target.startsWith("journey:") && item.target !== own ? words("journeys") : item.target,
  );
  return pattern(unique(targets)) ?? targets;
}
/** Many targets in one folder are said by their pattern, `folder/<id>`: a new thing there leaves the line as it was,
 * and each one's id is a row of that folder's list in Objetos. */
function pattern(targets: readonly string[]): string[] | undefined {
  if (targets.length <= 3) return undefined;
  const folders = unique(targets.map(target => target.slice(0, target.lastIndexOf("/") + 1)));
  const [folder] = folders;
  return folders.length === 1 && folder ? [`${folder}<id>`] : undefined;
}
export function menuItemLine(items: readonly Item[], language: Language, own?: string, say = true): string {
  const [first] = items;
  if (!first) return "";
  const destinations = items.flatMap(item => item.destinations ?? []);
  const targets = targetsOf(items, language, own, say);
  return menuLine.text(language, {
    act: first.act,
    targets: unique(targets).join(", "),
    house: destinations.some(each => each.kind === "house"),
    devices: unique(destinations.flatMap(each => (each.kind === "device" ? [each.device] : []))).join(", "),
    purpose: first.purpose ?? "",
  });
}
/** `say` false lists every journey by id: for a menu that is not cached and has no Contexto to name them. */
export function menuText(menu: readonly Item[], language: Language, own?: string, say = true): string {
  return kinds(menu)
    .map(items => menuItemLine(items, language, own, say))
    .join("\n");
}
