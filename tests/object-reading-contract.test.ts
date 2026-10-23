import assert from "node:assert/strict";
import test from "node:test";
import { readingFields } from "../src/interaction/fact-presentation.ts";
import { groupRelatedItems } from "../src/interaction/content-groups.ts";

test("object reading omits known empty content, never unknown or zero", () => {
  assert.deepEqual(readingFields(["body", "projects", "unknown", "count", "title"], {
    body: "  ", projects: [], count: 0, title: "A note",
  }), ["unknown", "count", "title"]);
});

test("related facts join continuously without crossing unrelated content", () => {
  const items = [{ kind: "fact", id: "name" }, { kind: "fact", id: "role" },
    { kind: "text", id: "help" }, { kind: "fact", id: "availability" }];
  assert.deepEqual(groupRelatedItems(items), [items.slice(0, 2), [items[2]], [items[3]]]);
  assert.deepEqual(groupRelatedItems([]), []);
});
