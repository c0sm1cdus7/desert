import { ok } from "node:assert/strict";
import type { Field } from "../surface/contract.ts";
import type { Router } from "../surface/router.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { readThrough, reasonIn } from "./read-screen.ts";
import { type, view } from "./promised-keys.ts";
import { confirmAnswer, probeWritten, writeAnswer } from "./promised-entry.ts";
export type Stopped = Readonly<{ kind: "data" | "cause"; ask: string }>;
/** One answer as a person gives it: written over what the field opened on and confirmed, or chosen by the key of
 * its option. False when the field itself does not take it: what cannot be written cannot be sent. */
export function answer(router: Router, field: Field, given: string, opened = field.initial ?? ""): true | Stopped {
  if (field.kind === "text" || field.kind === "secret") {
    Array.from(opened).forEach(() => router.send({ kind: "erase" }));
    probeWritten(router, field, "");
    writeAnswer(router, field, given);
    probeWritten(router, field, given);
    const canSend = router.screen(view).hints.some(hint => hint.intent === "confirm");
    confirmAnswer(router);
    /** What is complete and wrong stays where it was written, and the screen says why. */
    const why = field.wrong?.(given);
    if (why !== undefined) ok(reasonIn(router.screen(view).body, why), said.notSaid(why));
    if (canSend && why === undefined) return true;
    return { kind: field.valid?.(given) === false && why === undefined ? "data" : "cause", ask: field.ask };
  }
  if (field.kind === "many") {
    /** Each option is marked or cleared with space until what is marked is what the case says. */
    const [marked, wanted] = [opened, given].map(each => (each === "" ? [] : each.split(" · ")));
    field.options.forEach((option, i) => {
      if (marked?.includes(option.title) !== wanted?.includes(option.title)) router.send({ kind: "type", text: " " });
      if (i < field.options.length - 1) router.send({ kind: "down" });
    });
    confirmAnswer(router);
    return true;
  }
  if (field.kind === "pick") return pickAnswer(router, field, given);
  const key = field.options.find(option => option.title === given)?.key;
  ok(key, said.noKey(field.ask, given));
  type(router, key);
  return field.options.find(option => option.title === given)?.off ? { kind: "cause", ask: field.ask } : true;
}
/** Pick only existing references; a missing one has no name to render and no row to take. */
function pickAnswer(router: Router, field: Field & { kind: "pick" }, given: string): true | Stopped {
  /** The thing is looked for as on any menu: space, then its name; and taken where it shows among what is found. */
  if (field.valid?.(given) === false) {
    const row = field.found("").find(option => (option.value ?? option.title) === given);
    if (row) {
      const why = row.off ? row.detail : undefined;
      if (why !== undefined)
        ok(
          readThrough(router, screen => reasonIn(screen.body, why)),
          said.closedCause(field.ask, why),
        );
      return { kind: "cause", ask: field.ask };
    }
    /** A missing reference has no display name. Searching its raw value must not invent a selectable row. */
    type(router, ` ${given}`);
    ok(!field.found(given).some(option => (option.value ?? option.title) === given));
    if (field.found(given).length === 0) confirmAnswer(router);
    return { kind: "data", ask: field.ask };
  }
  const name = given === "" ? "" : field.shown(given);
  if (name !== "") type(router, ` ${name}`);
  const at = field.found(name).findIndex(option => (option.value ?? option.title) === given);
  if (at < 0 || field.found(name)[at]?.off) return { kind: "cause", ask: field.ask };
  /** What is not looked for is taken by its number: the cursor stands on what the datum already is, not first. */
  if (name === "" && at < 9) {
    type(router, String(at + 1));
    return true;
  }
  for (let step = 0; step < at; step++) router.send({ kind: "down" });
  confirmAnswer(router);
  return true;
}
