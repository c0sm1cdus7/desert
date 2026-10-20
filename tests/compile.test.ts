import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";

function definition(minLength = 1) {
  return {
    id: "notebook",
    objects: [{
      id: "note",
      facts: { title: { kind: "text", minLength }, copies: { kind: "integer", minimum: 1 } },
    }],
  };
}

test("a product compiles to a closed schema consumed by validation", () => {
  const application = compile(definition());
  assert.deepEqual(application.schema("note"), {
    type: "object",
    properties: {
      copies: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
      title: { type: "string", minLength: 1 },
    },
    required: ["copies", "title"],
    additionalProperties: false,
  });
  assert.equal(application.validate("note", { title: "Idea", copies: 1 }).valid, true);
});

test("changing only the contract changes accepted values", () => {
  const original = compile(definition(1));
  const changed = compile(definition(5));
  const value = { title: "Idea", copies: 1 };
  assert.equal(original.validate("note", value).valid, true);
  assert.equal(changed.validate("note", value).valid, false);
  assert.notEqual(original.digest, changed.digest);
});

test("validation neither coerces values nor removes unknown fields", () => {
  const application = compile(definition());
  for (const value of [
    { title: "Idea", copies: "1" }, { title: "Idea", copies: 1.5 },
    { title: "Idea", copies: 0 }, { title: "", copies: 1 },
    { copies: 1 }, { title: "Idea", copies: 1, owner: "someone" },
  ]) {
    const before = structuredClone(value);
    assert.equal(application.validate("note", value).valid, false);
    assert.deepEqual(value, before);
  }
});

test("known empty text is not the same as an absent required fact", () => {
  const application = compile(definition(0));
  assert.equal(application.validate("note", { title: "", copies: 1 }).valid, true);
  assert.equal(application.validate("note", { copies: 1 }).valid, false);
});

test("unknown semantics and duplicate definitions fail compilation", () => {
  const duplicate = definition();
  duplicate.objects.push(duplicate.objects[0]!);
  const invalid = [
    { ...definition(), policies: ["allowEverything"] },
    { id: "bad", objects: [{ id: "note", facts: { title: { kind: "magic" } } }] },
    { id: "bad", objects: [{ id: "note", facts: { title: { kind: "text", execute: true } } }] },
    duplicate,
  ];
  for (const candidate of invalid) assert.throws(() => compile(candidate), /Invalid definition/);
});

test("contradictory ranges are not silently accepted", () => {
  for (const field of [
    { kind: "text", minLength: 5, maxLength: 2 },
    { kind: "integer", minimum: 5, maximum: 2 },
  ]) assert.throws(() => compile({ id: "bad", objects: [{ id: "note", facts: { value: field } }] }), /contradictory/);
});

test("the compiled artifact cannot be changed through source or schema references", () => {
  const source = definition();
  const application = compile(source);
  source.objects[0]!.facts.title.minLength = 99;
  assert.throws(() => Object.defineProperty(application.schema("note").properties.title!, "minLength", { value: 0 }));
  assert.equal(application.validate("note", { title: "Idea", copies: 1 }).valid, true);
  assert.throws(() => application.schema("missing"));
  assert.throws(() => application.validate("missing", {}));
});

test("property order does not change contract identity", () => {
  const first = definition();
  const second = {
    objects: [{ facts: { copies: { minimum: 1, kind: "integer" }, title: { minLength: 1, kind: "text" } }, id: "note" }],
    id: "notebook",
  };
  assert.equal(compile(first).digest, compile(second).digest);
});
