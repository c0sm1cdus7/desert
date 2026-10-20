import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { notebookDefinition } from "./fixtures/notebook.ts";

test("authored Notebook survives JSON transport with the same compilation identity", () => {
  const transported: unknown = JSON.parse(JSON.stringify(Notebook));
  assert.equal(compile(Notebook).digest, compile(transported).digest);
});

const cases: [string, (source: ReturnType<typeof notebookDefinition>) => void, RegExp][] = [
  ["missing ownership policy", source => { source.policies.splice(0); }, /Missing ownership policy/],
  ["text owner policy", source => { source.policies[0]!.field = "title"; }, /Owner field must be principal/],
  ["ownership change", source => { Object.assign(source.journeys[2]!.command!.set!, { owner: { kind: "actor" } }); }, /Owner cannot be changed/],
  ["owner input", source => { Object.assign(source.journeys[0]!.command!, { input: ["title", "body", "owner"] }); }, /Principal cannot be command input/],
  ["missing create assignment", source => { Reflect.deleteProperty(source.journeys[0]!.command!.values!, "body"); }, /Missing create assignment/],
  ["invented assignment", source => { Object.assign(source.journeys[0]!.command!.values!, { secret: { kind: "literal", value: "x" } }); }, /Unknown field/],
  ["actor used as text", source => { Object.assign(source.journeys[0]!.command!.values!, { title: { kind: "actor" } }); }, /Actor assignment requires principal/],
  ["invalid guard value", source => { source.journeys[2]!.command!.when!.state = "published"; }, /Invalid literal/],
  ["unknown read field", source => { source.journeys[1]!.fields!.push("secret"); }, /Unknown field/],
  ["prototype read field", source => { source.journeys[1]!.fields!.push("constructor"); }, /Unknown field/],
  ["missing field language", source => { Reflect.deleteProperty(source.surfaces[0]!.language!.fields, "note.title"); }, /Missing field label/],
  ["missing journey language", source => { Reflect.deleteProperty(source.surfaces[0]!.language!.journeys, "read-note"); }, /Missing journey label/],
  ["duplicate journey", source => { source.journeys.push(source.journeys[0]!); }, /Duplicate journey/],
  ["duplicate surface", source => { source.surfaces.push(source.surfaces[0]!); }, /Duplicate surface/],
  ["weakened confirmation", source => { source.journeys[0]!.confirmation = "none"; }, /Invalid definition/],
  ["unknown execution hook", source => { Object.assign(source.journeys[0]!.command!, { handler: "run" }); }, /Invalid definition/],
];
for (const [name, change, reason] of cases) test(`raw contracts reject ${name}`, () => {
  const source = notebookDefinition();
  change(source);
  assert.throws(() => compile(source), reason);
});

test("input assignments cannot weaken destination constraints", () => {
  const source = notebookDefinition();
  source.objects[0]!.facts.title.minLength = 10;
  Object.assign(source.journeys[0]!.command!.values!.title, { field: "body" });
  assert.throws(() => compile(source), /Incompatible input assignment/);
});

test("invalid literal strings and duplicate enum members are rejected", () => {
  const source = notebookDefinition();
  Object.assign(source.journeys[0]!.command!.values!, { title: { kind: "literal", value: "" } });
  assert.throws(() => compile(source), /Invalid literal/);
  const duplicate = notebookDefinition();
  duplicate.objects[0]!.facts.state.values.push("active");
  assert.throws(() => compile(duplicate), /Invalid definition/);
});

test("two journeys cannot redefine one command identity", () => {
  const source = notebookDefinition();
  const duplicate = structuredClone(source.journeys[0]!);
  duplicate.id = "another-create";
  duplicate.command!.values!.state.value = "archived";
  source.journeys.push(duplicate);
  assert.throws(() => compile(source), /Conflicting command/);
});
