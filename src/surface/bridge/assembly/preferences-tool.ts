// Preferences on a surface: what a person may prefer not to see and the language they read in, each its own act.
import { surfaceTexts } from "../../../texts/surface.texts.ts";
import { capital } from "../../../texts/capital.ts";
import { hideable, type Hideable } from "../../../house/own-acts.ts";
import { hides, languageOf } from "../../../house/members.ts";
import { languages } from "../../../fields/languages.ts";
import { wordsIn, type InLanguage } from "../../../fields/phrases.ts";
import { identityTexts } from "../../../texts/identities.texts.ts";
import { genericTexts } from "../../../texts/generic-surface.texts.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Result, Tool, ToolAct, ViewRow } from "../../contract/shown-tool.ts";
import { asked } from "../questions/asking-parts.ts";
import { say, section, settle, type SurfacePorts } from "../ports/house-ports.ts";
type Words = InLanguage<typeof genericTexts.preferences>;
/** Where Preferences stands on every Menu: no tool of a program may take its name or its key. */
export const preferencesPlace = { id: "preferences", key: genericTexts.preferences.key } as const;
export function preferencesTool<X extends Program>(ports: SurfacePorts<X>): Tool {
  const said = wordsIn(genericTexts, ports.language).preferences;
  const hidden = (what: Hideable): boolean => hides(ports.state().house, ports.me, what);
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
        { key: said.language.key, title: said.language.name, detail: spokenBy(ports), act: "language" },
      ]),
    ],
    acts: {
      ...Object.fromEntries(hideable.map(what => [what, hideAct(ports, what, said)])),
      language: languageAct(ports, said),
    },
  };
}
/** The language an identity reads the house in, by its own name; none for whoever was never given one. */
function spokenBy<X extends Program>(ports: SurfacePorts<X>): string {
  const language = languageOf(ports.state().house, ports.me);
  return language ? say(ports, identityTexts.languageNames[language]) : "";
}
/** The language as an act: one of the languages, each by its own name, opening on the one it reads in now. */
function languageAct<X extends Program>(ports: SurfacePorts<X>, said: Words): ToolAct {
  const name = capital(said.language.name);
  const option = (language: (typeof languages)[number]) => ({
    title: say(ports, identityTexts.languageNames[language]),
    key: language.charAt(0),
    value: language,
  });
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
            options: languages.map(option),
            current: spokenBy(ports),
            currentSays: say(ports, surfaceTexts.current),
            only: true,
          },
    run: async ([answer]) => {
      const chosen = languages.find(each => each === answer || option(each).title === answer);
      const done = await settle(ports.act({ act: "speak", input: { language: chosen } }));
      if (done.status !== "accepted") return { ok: false, reason: say(ports, done.reason ?? "") };
      return { ok: true, text: said.now(name, chosen ? option(chosen).title : "") };
    },
  };
}
/** One preference as an act: it asks one thing, with what it is for as the question. */
function hideAct<X extends Program>(ports: SurfacePorts<X>, what: Hideable, said: Words): ToolAct {
  const hidden = (): boolean => hides(ports.state().house, ports.me, what);
  const words = said[what];
  const options = [said.show, said.hide];
  const run = async ([answer]: readonly string[]): Promise<Result> => {
    const on = answer === said.hide.title;
    const done = await settle(ports.act({ act: "prefer", input: { hide: what, on } }));
    if (done.status !== "accepted") return { ok: false, reason: say(ports, done.reason ?? "") };
    return { ok: true, text: said.now(capital(words.name), on ? said.hidden : said.shown) };
  };
  /** The question opens on how it is now. */
  const ask: ToolAct["next"] = answers => {
    /** It says how it is now, and that answer cannot be chosen again. */
    const current = hidden() ? said.hide.title : said.show.title;
    const ask = asked(capital(words.name));
    const currentSays = say(ports, surfaceTexts.current);
    return answers.length ? null : { ask, kind: "one", options, current, currentSays, only: true };
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
