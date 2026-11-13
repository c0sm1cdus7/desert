// How each kind of question receives the answer promised by a case.
import { ok } from "node:assert/strict";
import type { Field } from "../surface/contract.ts";
import type { Router } from "../surface/router.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { type, view } from "./promised-keys.ts";
import { confirmAnswer, probeWritten } from "./promised-entry.ts";

/** One answer as a person gives it: written over what the field opened on and confirmed, or chosen by the key of
 * its option. False when the field itself does not take it: what cannot be written cannot be sent. */
export function answer(router: Router, field: Field, given: string, opened = field.initial ?? ""): boolean {
  if (field.kind === "text" || field.kind === "secret") {
    if (field.valid?.(given) === false) return false;
    Array.from(opened).forEach(() => router.send({ kind: "erase" }));
    probeWritten(router, field, "");
    type(router, given);
    probeWritten(router, field, given);
    confirmAnswer(router);
    /** What is complete and wrong stays where it was written, and the screen says why. */
    const why = field.wrong?.(given);
    if (why !== undefined) ok(JSON.stringify(router.screen(view).body).includes(why), said.notSaid(why));
    return why === undefined;
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
  if (field.kind === "pick") {
    if (field.valid?.(given) === false) return false;
    /** The thing is looked for as on any menu: space, then its name; and taken where it shows among what is found. */
    const name = given === "" ? "" : field.shown(given);
    if (name !== "") type(router, ` ${name}`);
    const at = field.found(name).findIndex(option => (option.value ?? option.title) === given);
    ok(at >= 0, said.notFound(name));
    /** What is not looked for is taken by its number: the cursor stands on what the datum already is, not first. */
    if (name === "" && at < 9) return (type(router, String(at + 1)), true);
    for (let step = 0; step < at; step++) router.send({ kind: "down" });
    confirmAnswer(router);
    return true;
  }
  const key = field.options.find(option => option.title === given)?.key;
  ok(key, said.noKey(field.ask, given));
  type(router, key);
  return !field.options.find(option => option.title === given)?.off;
}
