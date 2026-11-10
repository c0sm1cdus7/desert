// The same cases, walked by keys through the router every renderer uses: what a person does to keep each promise.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { asking } from "../surface/bridge/asking.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Field } from "../surface/contract.ts";
import { formats } from "../surface/masks.ts";
import type { Router } from "../surface/router.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Case, Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { actRow, goTo, seated, type, view, type Seat } from "./promised-keys.ts";
import { shownChecks } from "./promised-off.ts";
import { cast, given, label, staged, wroteSince, type Aim, type Check } from "./promised-stage.ts";

/** One answer as a person gives it: written and confirmed, or chosen by the key of its option. False when the
 * field itself does not take it: what cannot be written cannot be sent. */
function answer(router: Router, field: Field, given: string): boolean {
  if (field.kind === "text" || field.kind === "secret") {
    if (field.valid?.(given) === false) return false;
    Array.from(field.initial ?? "").forEach(() => router.send({ kind: "erase" }));
    type(router, given);
    router.send({ kind: "confirm" });
    return true;
  }
  const key = field.options.find(option => option.title === given)?.key;
  ok(key, said.noKey(field.ask, given));
  type(router, key);
  return true;
}
/** From the Menu to the act, and into it when it can be taken. Where the tool itself says the act cannot be done
 * now, it has to be on the list all the same, off, saying exactly that: then it is not taken. */
function taken<X extends Program>(seat: Seat<X>, aim: Aim<X>, kase: Case<X>): boolean {
  const on = kase.on ?? aim.tool.id;
  goTo(seat, aim.tool.id, on);
  const row = actRow(seat, aim, on);
  ok(row, said.notOffered(aim.name));
  strictEqual(row.off ? row.detail : undefined, aim.act.offered?.(seat.state(), on), said.offFor(aim.name));
  if (!row.off) type(seat.router, aim.act.key);
  return !row.off;
}
/** Every answer the case's input needs, given one by one to the questions the surface really asks. False when a
 * field stopped it: the surface did not let the person say what the case says. */
function walk<X extends Program>({ router, tools, shown }: Seat<X>, aim: Aim<X>, kase: Case<X>): boolean {
  const words = { formats: formats(shown.locale), optionalMark: generic.optional };
  const answers = asking(aim.act.input, words).answers(kase.input);
  const tool = tools.find(known => known.id === aim.tool.id);
  const act = aim.act.on === "tool" ? tool?.acts[aim.name] : tool?.actsOn?.[aim.name];
  const next = (given: readonly string[]): Field | null => act?.next(given, kase.on ?? aim.tool.id) ?? null;
  const said = answers.every((given, index) => {
    const field = next(answers.slice(0, index));
    return field ? answer(router, field, given) : true;
  });
  if (said && next(answers)) type(router, aim.act.key);
  return said;
}
function walkCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const refused = "refused" in kase.then ? kase.then.refused : undefined;
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given);
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      const before = house().tools.state().through;
      try {
        /** What is off said why, and what a field does not let be written cannot be sent: neither breaks a refusal. */
        const done = taken(seat, aim, kase) && walk(seat, aim, kase);
        ok(done || refused !== undefined, said.notOffered(aim.name));
        if (!done) return;
        await seat.router.idle();
        const screen = JSON.stringify(seat.router.screen(view).body);
        const words = "refused" in kase.then ? kase.then.refused : kase.then.says;
        ok(screen.includes(JSON.stringify(words).slice(1, -1)), said.notSaid(words));
        deepStrictEqual(wroteSince(house(), before), "refused" in kase.then ? [] : kase.then.facts);
        /** Closing what was done leaves the person on a screen that exists: never on a thing its act took away. */
        seat.router.send({ kind: "cancel" });
        ok(!JSON.stringify(seat.router.screen(view).body).includes(surface.gone), said.lost(aim.name));
      } finally {
        seat.router.stop();
      }
    });
  return { name: label(aim, said.byKeys(kase.promise)), run };
}
/** Every case of every act, kept by keys from the Menu: that every act can be reached is checked by reaching it.
 * And what each person sees of what they cannot do. */
export function walkedChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  const cases = program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) =>
      act.cases.map(kase => walkCheck(program, shown, { tool, name, act }, kase)),
    ),
  );
  return [...cases, ...shownChecks(program, shown)];
}
