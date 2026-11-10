// Preferences on a surface: a menu of what a person may prefer not to see, each with how it is now, each its own act.
import { hideable, type Hideable } from "../../catalogs/acts.ts";
import { hides } from "../../house/house.ts";
import { genericTexts } from "../../texts/generic-surface.texts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Result, Tool, ToolAct, ViewRow } from "../contract.ts";
import { section, settle, type SurfacePorts } from "./house-ports.ts";

const said = genericTexts.preferences;
/** Where Preferences stands on every Menu: no tool of a program may take its name or its key. */
export const preferencesPlace = { id: "preferences", key: said.key } as const;
export function preferencesTool<X extends Program>(ports: SurfacePorts<X>): Tool {
  const hidden = (what: Hideable): boolean => hides(ports.state().house, ports.me, what);
  /** One preference as an act: it asks one thing, with what it is for as the question. */
  const act = (what: Hideable): ToolAct => {
    const words = said[what];
    const run = async ([answer]: readonly string[]): Promise<Result> => {
      const on = answer === said.hide.title;
      const done = await settle(ports.act({ act: "prefer", input: { hide: what, on } }));
      if (done.status !== "accepted") return { ok: false, reason: done.reason ?? "" };
      return { ok: true, text: said.now(words.name, on ? said.hidden : said.shown) };
    };
    const ask: ToolAct["next"] = answers =>
      answers.length ? null : { ask: words.purpose, kind: "one", options: [said.show, said.hide] };
    return {
      label: words.name,
      verb: words.name.toLowerCase(),
      key: words.key,
      hint: words.purpose,
      scope: "row",
      next: ask,
      run,
    };
  };
  /** Each preference on the list with how it is now; choosing it changes it. */
  const row = (what: Hideable): ViewRow => ({
    key: said[what].key,
    title: said[what].name,
    detail: hidden(what) ? said.hidden : said.shown,
    act: what,
  });
  return {
    id: preferencesPlace.id,
    name: said.name,
    place: { key: preferencesPlace.key, section: "system" },
    summary: () => "",
    view: () => [section(said.listed, hideable.map(row))],
    acts: Object.fromEntries(hideable.map(what => [what, act(what)])),
  };
}
