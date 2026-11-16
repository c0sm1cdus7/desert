// The two lists every menu opens with, checked for every program: what needs someone to act, and what the others did.
import { effect } from "../journal/events.ts";
import { errorIn } from "./read-screen.ts";
import { firstLine } from "../surface/bridge/notices.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Choice } from "../surface/screen.ts";
import { choices, stacksOf } from "../surface/lists.ts";
import type { Tool } from "../surface/shown-tool.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Case, Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { seated, openRows, view, type Seat } from "./promised-keys.ts";
import { prefer } from "./promised-off.ts";
import { promisedNeeds } from "./promised.ts";
import { cast, given, label, perform, staged, type Aim, type Check } from "./promised-stage.ts";
/** The rows of one of the two lists where a person stands: on the Menu, or on a tool's own menu. Nothing when the
 * list is not there at all. */
function listAt(tools: readonly Tool[], title: string, tool?: string): readonly Choice[] | undefined {
  const place = tool === undefined ? ({ kind: "menu", at: 0 } as const) : ({ kind: "view", tool, at: 0 } as const);
  return stacksOf(place, tools).find(stack => stack.title === title)?.rows;
}
/** What someone does is in Activity for other identities, on the Menu and on the tool's own menu, until
 * they open it by its key; and it is never there for who did it. */
function activityCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const actor = kase.by ?? cast.admin;
  const other = actor === cast.member ? cast.admin : cast.member;
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name });
      const written = done.effects.flatMap(effect =>
        effect.layer === "house" && effect.kind === "tool-entry" ? [effect] : [],
      );
      const [entry] = written;
      /** What was written for one identity alone is not for the rest to know of. */
      if (!entry) return;
      const theirs = seated(house(), other, shown);
      const own = seated(house(), actor, shown);
      const outside = seated(house(), actor === cast.outsider ? cast.admin : cast.outsider, shown);
      const news = (tools: readonly Tool[], tool?: string) =>
        listAt(tools, surface.activity, tool)?.find(row => row.title === firstLine(entry.data.text));
      try {
        ok(news(theirs.tools) && news(theirs.tools, aim.tool.id), said.noActivity(entry.data.text));
        strictEqual(news(own.tools), undefined, said.ownActivity(entry.data.text));
        await outsideActivity(outside, news, entry.data.text, aim.tool.id);
        strictEqual((listAt(outside.tools, surface.attentionList, aim.tool.id) ?? []).length, 0);
        const at = choices({ kind: "menu", at: 0 }, theirs.tools).findIndex(
          row => row.title === firstLine(entry.data.text),
        );
        ok(at >= 0, said.noActivity(entry.data.text));
        openRows(theirs.router, [at]);
        ok(!errorIn(theirs.router.screen(view).body, surface.gone), said.lost(aim.name));
        theirs.router.send({ kind: "menu" });
        strictEqual(news(theirs.tools), undefined, said.staysNew(entry.data.text));
      } finally {
        [theirs, own, outside].forEach(seat => seat.router.stop());
      }
    });
  return { name: label(aim, said.activity(kase.promise)), run };
}
/** Who has no tool still reads Activity, also hiding what is not theirs; who left the house reads nothing (6a). */
async function outsideActivity<X extends Program>(
  outside: Seat<X>,
  news: (tools: readonly Tool[], tool?: string) => unknown,
  text: string,
  tool: string,
): Promise<void> {
  if (!outside.state().house.grants.has(outside.state().by)) {
    strictEqual(news(outside.tools), undefined, said.absentReader);
    return;
  }
  ok(news(outside.tools) && news(outside.tools, tool), said.noActivity(text));
  await prefer(outside, "foreign", true);
  ok(news(outside.tools), said.noActivity(text));
  await prefer(outside, "foreign", false);
}
function checkPartialAttention<X extends Program>(
  by: string,
  house: import("./promised-stage.ts").House<X>,
  tool: string,
  told: (at?: string) => unknown,
  mine: unknown,
): void {
  if (by !== cast.member) return;
  house.bus.emit(effect("kit-set", { holder: cast.member, tool, acts: [] }, cast.admin));
  deepStrictEqual(told(tool), [], said.needRecipient(tool, cast.member));
  house.bus.emit(
    effect("kit-set", { holder: cast.member, tool, acts: ["__obsolete_action__".repeat(100)] }, cast.admin),
  );
  deepStrictEqual(told(tool), [], said.needRecipient(tool, cast.member));
  house.bus.emit(effect("kit-set", { holder: cast.member, tool, acts: null }, cast.admin));
  deepStrictEqual(told(tool), mine, said.needRecipient(tool, cast.member));
}
/** What a case promises needs someone to act is in Attention for who holds the tool, on the Menu and on the tool's
 * own menu: the thing, saying why, on a row that leads to it. */
function needsCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      await perform(house(), aim.tool.id, { ...kase, act: aim.name });
      const actor = kase.by ?? cast.admin;
      for (const [tool, promised] of promisedNeeds(aim, kase.then)) {
        const readers = new Set([
          ...promised.flatMap(need => (need.to === undefined ? [] : [need.to])),
          actor,
          cast.member,
        ]);
        for (const by of readers) {
          const { tools, router } = seated(house(), by, shown);
          const told = (at?: string) =>
            (listAt(tools, surface.attentionList, at) ?? [])
              .filter(row => row.open?.kind === "view" && row.open.tool === tool)
              .map(row => ({ target: row.opens ?? tool, why: row.detail }));
          try {
            const mine = promised
              .filter(need => need.to === undefined || need.to === by)
              .map(({ target, why }) => ({ target, why }));
            deepStrictEqual(told(tool), mine, said.needRecipient(tool, by));
            deepStrictEqual(told(), mine, said.needRecipient(tool, by));
            checkPartialAttention(by, house(), tool, told, mine);
          } finally {
            router.stop();
          }
        }
      }
    });
  return { name: label(aim, said.needing(kase.promise)), run };
}
/** The two lists are on the Menu and on every tool's own menu even with nothing in them; and each one that has
 * nothing is off them for who prefers not to see it then. A list with something in it stays: a program may need
 * someone from its first day. */
function emptyCheck<X extends Program>(program: Composition<X>, shown: Shown<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      const seat = seated(house(), cast.admin, shown);
      const outside = seated(house(), cast.outsider, shown);
      const places = [undefined, ...program.registry.map(tool => tool.id)];
      const lists = [surface.attentionList, surface.activity];
      const there = (tools: readonly Tool[], tool?: string): boolean[] =>
        lists.map(list => listAt(tools, list, tool) !== undefined);
      const everywhere = (): boolean[] => places.flatMap(tool => there(seat.tools, tool));
      const filled = (): boolean[] =>
        places.flatMap(tool => lists.map(list => (listAt(seat.tools, list, tool)?.length ?? 0) > 0));
      try {
        ok(everywhere().every(Boolean), said.listsMissing);
        /** Who holds no tool has the two lists on the Menu all the same. */
        ok(there(outside.tools).every(Boolean), said.listsMissing);
        const kept = filled();
        await prefer(seat, "empty", true);
        deepStrictEqual(everywhere(), kept, said.listsShown);
        await prefer(seat, "empty", false);
        ok(everywhere().every(Boolean), said.listsMissing);
      } finally {
        [seat, outside].forEach(open => open.router.stop());
      }
    });
  return { name: said.emptyLists, run };
}
export function noticeChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  const cases = program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) => act.cases.map(kase => ({ aim: { tool, name, act }, kase }))),
  );
  const done = cases.filter(({ kase }) => !("refused" in kase.then));
  const needing = done.filter(({ aim, kase }) => promisedNeeds(aim, kase.then).length > 0);
  return [
    ...done.map(({ aim, kase }) => activityCheck(program, shown, aim, kase)),
    ...needing.map(({ aim, kase }) => needsCheck(program, shown, aim, kase)),
    emptyCheck(program, shown),
  ];
}
