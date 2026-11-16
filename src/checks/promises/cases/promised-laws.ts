// The laws every act of every program keeps: nobody promises them case by case, and every act is checked on them.
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import { inspect } from "node:util";
import { Type } from "@sinclair/typebox";
import { mindTargetCauses } from "../identities/kit-checks.ts";
import { withoutActionCheck, closeCoreSetup, isCoreScene } from "../identities/identity-checks.ts";
import { fieldValidity } from "../../../fields/fields.ts";
import { openingChecks } from "./opening-checks.ts";
import { alsoCauses } from "./also-causes.ts";
import { deepStrictEqual, ok } from "node:assert/strict";
import { promiseTexts as said } from "../../../texts/promises.texts.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import { ofTheBase, type Case, type Composition } from "../../../tools/promises.ts";
import { outsideOf } from "../../../tools/schema-breaks.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import {
  cast,
  given,
  label,
  perform,
  staged,
  wroteSince,
  type Aim,
  type Check,
  type Doing,
} from "../promised-stage.ts";
/** An act stands on its tool or on one of its things: done anywhere else, the house refuses it and writes nothing. */
function placeCheck<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const doing = { ...kase, act: aim.name };
      /** An act on the tool is tried on a thing its own case leaves; when it leaves none, there is no elsewhere. */
      if (aim.act.on === "tool") await perform(house(), aim.tool.id, doing);
      const things = aim.tool.targets(house().tools.state());
      const elsewhere = aim.act.on === "tool" ? things[0] : aim.tool.id;
      if (elsewhere === undefined) return;
      const before = house().tools.state().through;
      const done = await perform(house(), aim.tool.id, { ...doing, on: elsewhere });
      deepStrictEqual([done.status, done.reason], ["rejected", toolTexts.unknown]);
      deepStrictEqual(wroteSince(house(), before), []);
    });
  return { name: label(aim, said.misplaced), run };
}
/** An act that says what the thing is today refuses to leave it as it is: it would write nothing new. */
function unchangedCheck<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check[] {
  const { today } = aim.act;
  if (!today) return [];
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const input = today(house().tools.state(), kase.on ?? aim.tool.id, house().now());
      if (input === undefined) return;
      const before = house().tools.state().through;
      const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name, input });
      deepStrictEqual([done.status, done.reason], ["rejected", toolTexts.unchanged]);
      deepStrictEqual(wroteSince(house(), before), []);
    });
  return [{ name: label(aim, said.unchanged), run }];
}
/** The laws of every act, checked from a case of its own that the house accepts. */
export function lawChecks<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check[] {
  const refusal = (promise: string, doing: Partial<Doing>, cause: string, input = kase.input): Check => ({
    name: label(aim, promise),
    run: () =>
      staged(program, async ({ house }) => {
        await given(house(), aim.tool.id, kase.given, kase.at);
        closeCoreSetup(house(), aim.tool.id, doing);
        const before = house().tools.state().through;
        const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name, input, ...doing });
        deepStrictEqual([done.status, done.reason], ["rejected", cause]);
        deepStrictEqual(wroteSince(house(), before), []);
      }),
  });
  const core = aim.tool.id === "identities";
  const kitReason = toolTexts.kitRefusal(aim.tool.id);
  const unheld = core ? cast.member : cast.outsider;
  return [
    withoutActionCheck(program, aim, kase),
    ...outsideOf(aim.act.input, kase.input).map((input, index) =>
      refusal(said.outside(index + 1), {}, toolTexts.invalid, input),
    ),
    refusal(
      said.notHeld,
      { by: isCoreScene(aim) ? "absent" : unheld },
      isCoreScene(aim) ? toolTexts.unassigned : kitReason,
    ),
    refusal(said.unseen, { by: core ? (kase.by ?? cast.admin) : cast.member, attends: false }, toolTexts.unattended),
    placeCheck(program, aim, kase),
    ...unchangedCheck(program, aim, kase),
  ];
}
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
/** Check defaults wherever a declaration nests fields, variants, or items. */
export function defaultsIn(schema: unknown, path = "$"): void {
  if (!isRecord(schema)) return;
  const node = schema;
  if (Object.hasOwn(node, "default")) {
    const value = node.default;
    if (
      value !== undefined &&
      (({ invalid, wrong }) => invalid || wrong !== undefined)(fieldValidity(Type.Unsafe(node), value, 0))
    )
      throw new Error(`Invalid default at ${path}: ${inspect(value)}`);
  }
  if (node.properties && typeof node.properties === "object")
    for (const [key, child] of Object.entries(node.properties)) defaultsIn(child, `${path}.${key}`);
  if (isRecord(node.patternProperties))
    for (const [key, child] of Object.entries(node.patternProperties)) defaultsIn(child, `${path}[${key}]`);
  if (Array.isArray(node.oneOf)) node.oneOf.forEach((child, index) => defaultsIn(child, `${path}|${index}`));
  if (Array.isArray(node.anyOf)) node.anyOf.forEach((child, index) => defaultsIn(child, `${path}|${index}`));
  if (Array.isArray(node.allOf)) node.allOf.forEach((child, index) => defaultsIn(child, `${path}&${index}`));
  if (Array.isArray(node.items)) node.items.forEach((child, index) => defaultsIn(child, `${path}[${index}]`));
  else if (node.items) defaultsIn(node.items, `${path}[]`);
  if (node.additionalProperties && typeof node.additionalProperties === "object")
    defaultsIn(node.additionalProperties, `${path}.*`);
}
/** What an act declares has to add up: a case the house accepts, and a case for each cause it may refuse with. */
export function coverage<X extends Program>(program: Composition<X>, aim: Aim<X>, shown: Shown<X>): Check {
  const refused = aim.act.cases.flatMap(kase => ("refused" in kase.then ? [kase.then.refused] : []));
  const run = (): Promise<void> =>
    Promise.resolve().then(async () => {
      defaultsIn(aim.act.input);
      await openingChecks(program, aim, shown);
      const does = aim.act.cases.some(kase => !("refused" in kase.then));
      ok(does, said.nothingDone);
      /** What an act puts to be confirmed is promised word for word by one of its cases. */
      const sure = aim.act.cases.some(kase => !("refused" in kase.then) && kase.then.sure !== undefined);
      ok(!aim.act.confirms || sure, said.unsure);
      /** What the base itself refuses with is not the act's to declare; a case may still promise it. */
      const own = (causes: readonly string[]) => [...new Set(causes.filter(cause => !ofTheBase(cause)))].sort();
      deepStrictEqual(
        own(
          [...refused, ...(await alsoCauses(program, aim)), ...(await mindTargetCauses(program, aim))].map(
            cause => aim.act.outside.find(out => cause.startsWith(`${out} · `)) ?? cause,
          ),
        ),
        own([...aim.act.refuses, ...aim.act.outside]),
        said.causesMismatch,
      );
    });
  return { name: label(aim, said.covered), run };
}
