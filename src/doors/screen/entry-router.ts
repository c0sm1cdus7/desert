// Signing in is a screen like any other: one tool, one act, one masked question, whose run redeems an invitation.
import { workingLanguage } from "../../fields/languages.ts";
import { everySaid } from "../../fields/phrases.ts";
import { redrawMs } from "../../journal/clock.ts";
import type { Field } from "../../surface/contract/contract.ts";
import type { Result, Tool } from "../../surface/contract/shown-tool.ts";
import { limited } from "../../surface/formats/masks.ts";
import type { DefectReporter } from "../../surface/router/router-defect.ts";
import { startRouter, type Router } from "../../surface/router/router.ts";
import { begin, type Bar } from "../../surface/session/screen.ts";
import { screenDoorTexts as said } from "../../texts/screen-door.texts.ts";
import type { OpenHouse } from "../socket/client/open-house-router.ts";

/** What the host lends the entry: the exchange of a code (it reaches the network; the door may not), its Barra's
 * clock, and where a defect is reported. */
export type EntrySource = Readonly<{
  redeem: (code: string) => Promise<Result>;
  bar: () => Bar;
  defect: DefectReporter;
}>;
/** The invitation's alphabet and shape, as the house issues it (house/doors/door-material.ts): four, a dash, four. */
const invitation: Field = {
  kind: "text",
  ask: everySaid(said.ask),
  mask: limited("23456789ABCDEFGHJKLMNPQRSTUVWXYZ-", 9, said.shape),
};
const entryTool = (redeem: EntrySource["redeem"]): Tool => ({
  id: "entry",
  name: everySaid(said.tool),
  place: { key: "e", section: "tools" },
  summary: () => "",
  view: () => [],
  acts: {
    join: {
      scope: "all",
      label: everySaid(said.tool),
      verb: everySaid(said.verb),
      next: answers => (answers.length ? null : invitation),
      run: async ([code = ""]) => {
        const result = await redeem(code);
        return result.ok ? { ok: true, text: everySaid(said.done) } : result;
      },
    },
  },
});
/** The router of a session with no key yet: its first screen is the question, and its Barra says nobody joined.
 * Nobody's language is known before the invitation names an identity: its words are said in every language, and
 * what the surface says of its own is in the language the house works in. */
export function entryRouter(source: EntrySource): Router {
  const tools = [entryTool(source.redeem)];
  return startRouter({
    tools,
    bar: () => ({ ...source.bar(), state: "disconnected", language: workingLanguage }),
    first: [begin(tools, "entry", "join")],
    redrawMs,
    defect: source.defect,
  });
}
/** The entry as a host hands it to the door: it never ends (disconnected is how it starts), and once a code is
 * accepted it says so, so the door asks the host again and the session goes on in the house. */
export function entryHouse(source: EntrySource): OpenHouse {
  let admitted = false;
  const router = entryRouter({
    ...source,
    redeem: async code => {
      const result = await source.redeem(code);
      admitted ||= result.ok;
      return result;
    },
  });
  return {
    router,
    ended: () => false,
    failure: () => undefined,
    watch: changed => router.watch(changed),
    close: () => router.stop(),
    admitted: () => admitted,
  };
}
