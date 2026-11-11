// The two lists every menu opens with, checked for every program: what needs someone to act, and what the others did.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Choice } from "../surface/lists.ts";
import { stacksOf } from "../surface/lists.ts";
import type { Tool } from "../surface/shown-tool.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Case, Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { seated, type, view } from "./promised-keys.ts";
import { prefer } from "./promised-off.ts";
import { cast, given, label, perform, staged, type Aim, type Check } from "./promised-stage.ts";

/** The rows of one of the two lists where a person stands: on the Menu, or on a tool's own menu. Nothing when the
 * list is not there at all. */
function listAt(tools: readonly Tool[], title: string, tool?: string): readonly Choice[] | undefined {
  const place = tool === undefined ? ({ kind: "menu", at: 0 } as const) : ({ kind: "view", tool, at: 0 } as const);
  return stacksOf(place, tools).find(stack => stack.title === title)?.rows;
}
/** What someone does is in Activity for the others who hold its tool, on the Menu and on the tool's own menu, until
 * they open it by its key; and it is never there for who did it. */
function activityCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const actor = kase.by ?? cast.admin;
  const other = actor === cast.member ? cast.admin : cast.member;
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given);
      const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name });
      const written = done.effects.flatMap(effect =>
        effect.layer === "house" && effect.kind === "tool-entry" ? [effect] : [],
      );
      const [entry] = written;
      /** What was written for one identity alone is not for the rest to know of. */
      if (!entry || entry.data.recipient !== undefined) return;
      const theirs = seated(house(), other, shown);
      const own = seated(house(), actor, shown);
      const news = (tools: readonly Tool[], tool?: string) =>
        listAt(tools, surface.activity, tool)?.find(row => row.title === entry.data.text);
      try {
        ok(news(theirs.tools) && news(theirs.tools, aim.tool.id), said.noActivity(entry.data.text));
        strictEqual(news(own.tools), undefined, said.ownActivity(entry.data.text));
        const key = news(theirs.tools)?.key ?? "";
        ok(key, said.keyless(entry.data.text));
        type(theirs.router, key);
        ok(!JSON.stringify(theirs.router.screen(view).body).includes(surface.gone), said.lost(aim.name));
        theirs.router.send({ kind: "menu" });
        strictEqual(news(theirs.tools), undefined, said.staysNew(entry.data.text));
      } finally {
        [theirs, own].forEach(seat => seat.router.stop());
      }
    });
  return { name: label(aim, said.activity(kase.promise)), run };
}
/** What a case promises needs someone to act is in Attention for who holds the tool, on the Menu and on the tool's
 * own menu: the thing, saying why, on a row that leads to it. */
function needsCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given);
      await perform(house(), aim.tool.id, { ...kase, act: aim.name });
      const promised = "refused" in kase.then ? [] : (kase.then.needs ?? []);
      const { tools, router } = seated(house(), kase.by ?? cast.admin, shown);
      const told = (tool?: string) =>
        (listAt(tools, surface.attentionList, tool) ?? []).map(row => ({ target: row.opens, why: row.detail }));
      const things = (): readonly string[] => aim.tool.targets(house().tools.state());
      const mine = (need: { target: string | undefined }): boolean => things().includes(need.target ?? "");
      try {
        deepStrictEqual(told(aim.tool.id), promised);
        deepStrictEqual(told().filter(mine), promised);
      } finally {
        router.stop();
      }
    });
  return { name: label(aim, said.needing(kase.promise)), run };
}
/** The two lists are on the Menu and on every tool's own menu even with nothing in them; and off both for who
 * prefers not to see them then. */
function emptyCheck<X extends Program>(program: Composition<X>, shown: Shown<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      const seat = seated(house(), cast.admin, shown);
      const places = [undefined, ...program.registry.map(tool => tool.id)];
      const there = (): boolean[] =>
        places.flatMap(tool =>
          [surface.attentionList, surface.activity].map(list => listAt(seat.tools, list, tool) !== undefined),
        );
      try {
        deepStrictEqual(
          there(),
          there().map(() => true),
          said.listsMissing,
        );
        await prefer(seat, "empty", true);
        deepStrictEqual(
          there(),
          there().map(() => false),
          said.listsShown,
        );
        await prefer(seat, "empty", false);
        deepStrictEqual(
          there(),
          there().map(() => true),
          said.listsMissing,
        );
      } finally {
        seat.router.stop();
      }
    });
  return { name: said.emptyLists, run };
}
export function noticeChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  const cases = program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) => act.cases.map(kase => ({ aim: { tool, name, act }, kase }))),
  );
  const done = cases.filter(({ kase }) => !("refused" in kase.then));
  const needing = done.filter(({ kase }) => !("refused" in kase.then) && kase.then.needs !== undefined);
  return [
    ...done.map(({ aim, kase }) => activityCheck(program, shown, aim, kase)),
    ...needing.map(({ aim, kase }) => needsCheck(program, shown, aim, kase)),
    emptyCheck(program, shown),
  ];
}
