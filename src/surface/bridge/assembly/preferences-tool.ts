// Preferences on a surface: a menu of what a person may prefer not to see, each with how it is now, each its own act.
import { capital } from "../../../texts/capital.ts";
import { hideable, type Hideable } from "../../../house/own-acts.ts";
import { hides, languageOf } from "../../../house/members.ts";
import { languages } from "../../../fields/languages.ts";
import { identityTexts } from "../../../texts/identities.texts.ts";
import { genericTexts } from "../../../texts/generic-surface.texts.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Result, Tool, ToolAct, ViewRow } from "../../contract/shown-tool.ts";
import { asked } from "../questions/asking-parts.ts";
import { section, settle, type SurfacePorts } from "../ports/house-ports.ts";
const said = genericTexts.preferences;
const options = [said.show, said.hide];

/** Where Preferences stands on every Menu: no tool of a program may take its name or its key. */
export const preferencesPlace = { id: "preferences", key: said.key } as const;
export function preferencesTool<X extends Program>(ports: SurfacePorts<X>): Tool {
  const hidden = (what: Hideable): boolean => hides(ports.state().house, ports.me, what);
  const act = (what: Hideable): ToolAct => hideAct(ports, what);
  const spoken = (): string => spokenBy(ports);
  const language = languageAct(ports);
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
    view: () => [
      section(said.listed, [
        ...hideable.map(row),
        { key: said.language.key, title: said.language.name, detail: spoken(), act: "language" },
      ]),
    ],
    acts: { ...Object.fromEntries(hideable.map(what => [what, act(what)])), language },
  };
}

/** The language an identity reads the house in, by its own name; none for whoever was never given one. */
function spokenBy<X extends Program>(ports: SurfacePorts<X>): string {
  const language = languageOf(ports.state().house, ports.me);
  return language ? identityTexts.languageNames[language] : "";
}
/** The language as an act: one of the languages, each by its own name, opening on the one it reads in now. */
function languageAct<X extends Program>(ports: SurfacePorts<X>): ToolAct {
  const names = identityTexts.languageNames;
  const name = capital(said.language.name);
  return {
    label: said.language.name,
    title: () => name,
    verb: said.save,
    key: said.language.key,
    scope: "row",
    next: answers =>
      answers.length
        ? null
        : {
            ask: asked(name),
            kind: "one",
            options: languages.map(each => ({ title: names[each], key: each.slice(0, 1) })),
            current: spokenBy(ports),
            only: true,
          },
    run: async ([answer]) => {
      const chosen = languages.find(each => names[each] === answer);
      const done = await settle(ports.act({ act: "speak", input: { language: chosen } }));
      if (done.status !== "accepted") return { ok: false, reason: done.reason ?? "" };
      return { ok: true, text: said.now(name, answer ?? "") };
    },
  };
}
/** One preference as an act: it asks one thing, with what it is for as the question. */
function hideAct<X extends Program>(ports: SurfacePorts<X>, what: Hideable): ToolAct {
  const hidden = (what: Hideable): boolean => hides(ports.state().house, ports.me, what);
  const words = said[what];
  const run = async ([answer]: readonly string[]): Promise<Result> => {
    const on = answer === said.hide.title;
    const done = await settle(ports.act({ act: "prefer", input: { hide: what, on } }));
    if (done.status !== "accepted") return { ok: false, reason: done.reason ?? "" };
    return { ok: true, text: said.now(capital(words.name), on ? said.hidden : said.shown) };
  };
  /** The question opens on how it is now. */
  const ask: ToolAct["next"] = answers => {
    /** It says how it is now, and that answer cannot be chosen again. */
    const current = hidden(what) ? said.hide.title : said.show.title;
    const ask = asked(capital(words.name));
    return answers.length ? null : { ask, kind: "one", options, current, only: true };
  };
  return {
    label: words.name,
    title: () => capital(words.name),
    verb: said.save,
    key: words.key,
    scope: "row",
    next: ask,
    run,
  };
}
