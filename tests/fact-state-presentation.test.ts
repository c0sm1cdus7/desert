import assert from "node:assert/strict";
import test from "node:test";
import { factState, presentFact, presentFacts, presentTitle } from "../src/interaction/fact-presentation.ts";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import type { HumanSurface } from "../src/web/types.ts";

test("fact state distinguishes absence from literal content without rewriting values", () => {
  for (const value of [undefined, null]) {
    assert.equal(factState(value), "unknown");
    assert.equal(presentFact(value), "Unknown");
  }
  for (const value of ["", " ", "\n\t "]) {
    assert.equal(factState(value), "empty");
    assert.equal(presentFact(value), "Empty");
  }
  for (const value of [0, 42, "Empty", "Unknown", " First\n\nSecond "]) {
    assert.equal(factState(value), "known");
    assert.equal(presentFact(value), String(value));
  }
  assert.equal(presentTitle(" \n "), "Untitled", "title fallback remains a separate contract");
});

test("fact projection preserves source facts and does not expose inherited values", () => {
  const surface = compile(Notebook).surface("human") as HumanSurface;
  const facts = Object.freeze({ title: "  ", body: " First\n\nSecond " });
  const snapshot = structuredClone(facts);
  const result = presentFacts(surface, "note", ["title", "body", "toString"], facts);
  assert.deepEqual(result.facts, snapshot);
  assert.deepEqual(facts, snapshot);
  assert.equal(Object.hasOwn(result.facts, "toString"), false);
});
