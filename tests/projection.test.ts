import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { LegacyShape as Notebook } from "./fixtures/legacy-shape.ts";
import { createShapeValidator } from "../src/client.ts";

test("a serialized shape projection can be consumed independently of the controller", () => {
  const application = compile(Notebook);
  const projection = JSON.parse(JSON.stringify(application.describe()));
  assert.equal(projection.protocol, "desert.shapes/1");
  assert.equal(projection.productId, "notebook");
  assert.equal(projection.contractDigest, application.digest);
  const validate = createShapeValidator(projection.objects.note);
  for (const [value, expected] of [
    [{ title: "Idea", body: "A new product" }, true],
    [{ title: "", body: "A new product" }, false],
    [{ title: "Idea" }, false],
    [{ title: "Idea", body: 12 }, false],
    [{ title: "Idea", body: "A new product", owner: "alice" }, false],
  ] as const) {
    assert.equal(validate(value).valid, expected);
    assert.equal(application.validate("note", value).valid, expected);
  }
});

test("projections are frozen and have no execution or authorization semantics", () => {
  const projection = compile(Notebook).describe();
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.objects.note), true);
  assert.equal("execute" in projection, false);
  assert.equal("authority" in projection, false);
});

test("validation does not invoke input accessors or inherit facts", () => {
  const application = compile(Notebook);
  let reads = 0;
  const accessor = { get title() { reads++; return "Idea"; }, body: "Text" };
  assert.equal(application.validate("note", accessor).valid, false);
  assert.equal(reads, 0);
  assert.equal(application.validate("note", Object.create({ title: "Idea", body: "Text" })).valid, false);
});

test("validation results do not share mutable errors across calls", () => {
  const validate = createShapeValidator(compile(Notebook).schema("note"));
  const invalid = validate({});
  const preserved = structuredClone(invalid);
  validate({ title: "Idea", body: "Text" });
  assert.deepEqual(invalid, preserved);
});
