import assert from "node:assert/strict";
import test from "node:test";
import { compileViewProgram } from "../src/views/program.ts";
import { navigationOwnershipFixture } from "./fixtures/navigation-ownership.ts";
import { program } from "./fixtures/view-program.ts";

test("Compiled human exposure cannot regain another navigation owner through a mutable variable", () => {
  const { surface } = navigationOwnershipFixture();
  const duplicateNavigation = {
    navigation: { entry: "read-note", primaryAction: "create-note", subjectActions: ["archive-note"] },
    entry: "read-note", primaryAction: "create-note", subjectActions: ["archive-note"],
  };
  for (const [key, declared] of Object.entries(duplicateNavigation)) {
    for (const value of [declared, undefined, null]) {
      const candidate = { ...surface, [key]: value };
      assert.throws(() => compileViewProgram(program, candidate), { message: "DUPLICATE_NAVIGATION_OWNER" },
        `The ${key} property must be rejected even when its value is ${String(value)}`);
    }
  }
});

test("View compilation validates the canonical connection policy rather than trusting truthy metadata", () => {
  const { surface } = navigationOwnershipFixture();
  const policy = { availability: "journey-dependencies", draftRetention: "session-memory", reconnect: "refresh-without-replay" };
  for (const connection of [{}, true, [], { ...policy, availability: "navigator-online" },
    { ...policy, draftRetention: "disk" }, { ...policy, reconnect: "replay-writes" }, { ...policy, custom: true }]) {
    const candidate = { ...surface, connection };
    assert.throws(() => compileViewProgram(program, candidate as never), { message: "INVALID_VIEW_PROGRAM_SURFACE" });
  }
  assert.doesNotThrow(() => compileViewProgram(program, surface));
  assert.doesNotThrow(() => compileViewProgram(program, structuredClone(surface)));
});
