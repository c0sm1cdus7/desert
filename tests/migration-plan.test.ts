// Plan §15, step 7.3 without a database: a destructive or narrowing change fails MIGRATION_DECISION_REQUIRED until its
// decision is declared, a stale decision fails MIGRATION_DECISION_UNUSED, a committed migration that was edited fails
// MIGRATION_EDITED (body digest, header, name, and regeneration from its models), and the repository's own history is whole.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { compile } from "../src/compile.ts";
import { checkHistory, planNext } from "../src/storage/migration-history.ts";
import { chainLeadsTo, readMigration } from "../src/storage/migrations.ts";
import { sha256 } from "../src/storage/model.ts";
import { widens } from "../src/storage/plan-columns.ts";
import { storedInstallations } from "../scripts/storage-products.ts";
import { English, LedgerV1, LedgerV2, LedgerV3, v3Decisions } from "./fixtures/migration-ledger.ts";
import { repository, type Repository } from "./support/migration-repository.ts";

const named = (code: string, detail?: RegExp) => (error: unknown) =>
  error instanceof Error && error.message.startsWith(`${code}: `) && (detail === undefined || detail.test(error.message));

function atV2(run: (repo: Repository) => void) {
  const repo = repository();
  try {
    repo.plan(LedgerV1, English);
    repo.plan(LedgerV2, English);
    run(repo);
  } finally { repo.dispose(); }
}

test("MIGRATION_DECISION_REQUIRED: each destructive or narrowing change of v2 → v3 is refused without its own decision", () => atV2(repo => {
  const expected: Record<string, RegExp> = {
    "entry.tags": /^MIGRATION_DECISION_REQUIRED: entry\.tags: drops a fact/,
    "entry.books": /^MIGRATION_DECISION_REQUIRED: entry\.books: drops a reference fact/,
    book: /^MIGRATION_DECISION_REQUIRED: book: drops an object type/,
    "entry.state": /^MIGRATION_DECISION_REQUIRED: entry\.state: narrows the enum: removes "draft"/,
    "entry.title": /^MIGRATION_DECISION_REQUIRED: entry\.title: narrows what the column admits/,
    "entry.priority": /^MIGRATION_DECISION_REQUIRED: entry\.priority: adds a required fact/,
  };
  const before = readdirSync(new URL("src/storage/migrations/", repo.root));
  assert.throws(() => planNext(repo.root, LedgerV3, English, []), named("MIGRATION_DECISION_REQUIRED"));
  v3Decisions.forEach((_, position) => {
    const without = v3Decisions.filter((__, index) => index !== position);
    const decision = v3Decisions[position]!;
    const site = "drop" in decision && decision.object === "book" ? "book"
      : `${decision.object}.${Object.values(decision).find(value => typeof value === "object")!.field}`;
    assert.throws(() => planNext(repo.root, LedgerV3, English, without), (error: unknown) =>
      error instanceof Error && expected[site]!.test(error.message), site);
  });
  assert.ok(planNext(repo.root, LedgerV3, English, v3Decisions).migration, "control: with every decision the plan succeeds");
  assert.deepEqual(readdirSync(new URL("src/storage/migrations/", repo.root)), before, "planning writes nothing");
}));

test("MIGRATION_DECISION_UNUSED and MIGRATION_DECISION: a stale, malformed or wrong decision is refused", () => atV2(repo => {
  assert.throws(() => planNext(repo.root, LedgerV3, English, [...v3Decisions, { object: "entry", drop: { field: "owner", approvedBy: "franco" } }]),
    named("MIGRATION_DECISION_UNUSED"));
  assert.throws(() => planNext(repo.root, LedgerV2, English, [{ object: "entry", narrow: { field: "title", approvedBy: "franco" } }]),
    named("MIGRATION_DECISION_UNUSED", /nothing to plan/), "the history already ends at v2");
  assert.throws(() => planNext(repo.root, LedgerV3, English, [...v3Decisions, { object: "entry", drop: { field: "tags" } }]), named("MIGRATION_DECISION"),
    "a drop names who approved it");
  const wrong = v3Decisions.map(decision => "migrate" in decision ? { object: "entry", migrate: { field: "state", from: "draft", to: "draft" } } : decision);
  assert.throws(() => planNext(repo.root, LedgerV3, English, wrong), named("MIGRATION_DECISION", /must map a removed value to a kept one/));
  const badFill = v3Decisions.map(decision => "fill" in decision ? { object: "entry", fill: { field: "priority", value: "high", approvedBy: "franco" } } : decision);
  assert.throws(() => planNext(repo.root, LedgerV3, English, badFill), named("MIGRATION_DECISION", /is not a bigint/));
}));

test("MIGRATION_EDITED: a committed migration whose body, header or name changed is refused, even with a recomputed body digest", () => atV2(repo => {
  const [path] = readdirSync(new URL("src/storage/migrations/", repo.root)).map(name => `src/storage/migrations/${name}`);
  const text = repo.read(path!);
  assert.equal(readMigration(path!, text).digest, sha256(text));
  const body = text.slice(text.indexOf("\nCREATE") + 1);
  const edited = text.replace("BETWEEN 1 AND 80", "BETWEEN 1 AND 90");
  assert.throws(() => readMigration(path!, edited), named("MIGRATION_EDITED", /body differs from the body digest/));
  assert.throws(() => readMigration(path!, text.replace("Do not edit.", "Edited.")), named("MIGRATION_EDITED", /header/));
  assert.throws(() => readMigration(path!.replace(compile(LedgerV1).digest, "0".repeat(64)), text), named("MIGRATION_EDITED", /name differs/));
  // A forger who also rewrites the body digest still fails: the body is regenerated from its two models and decisions.
  const editedBody = edited.slice(edited.indexOf("\nCREATE") + 1);
  const forged = edited.replace(`body sha256:${sha256(body)}`, `body sha256:${sha256(editedBody)}`);
  assert.doesNotThrow(() => readMigration(path!, forged));
  assert.deepEqual(checkHistory(repo.root, LedgerV2, English, []), [], "control: the untouched history is whole");
  repo.write(path!, forged);
  assert.deepEqual(checkHistory(repo.root, LedgerV2, English, []).map(problem => problem.split(":")[0]), ["MIGRATION_EDITED"]);
  // And a client that applied the original refuses the forged chain: its recorded digest no longer names a migration.
  assert.equal(chainLeadsTo([readMigration(path!, forged)], "ledger", [sha256(text)], compile(LedgerV2).digest), false);
  assert.equal(chainLeadsTo([readMigration(path!, text)], "ledger", [sha256(text)], compile(LedgerV2).digest), true);
}));

test("MIGRATION_PLAN_MISSING: a declaration whose digest no committed migration reaches fails the check until it is planned", () => atV2(repo => {
  repo.model(LedgerV3, English); // `--write` without `plan`
  assert.deepEqual(checkHistory(repo.root, LedgerV3, English, v3Decisions).map(problem => problem.split(":")[0]), ["MIGRATION_PLAN_MISSING"]);
  assert.deepEqual(checkHistory(repo.root, LedgerV3, English, []).map(problem => problem.split(":")[0]), ["MIGRATION_DECISION_REQUIRED"]);
  repo.plan(LedgerV3, English, v3Decisions);
  assert.deepEqual(checkHistory(repo.root, LedgerV3, English, []), []);
  assert.deepEqual(checkHistory(repo.root, LedgerV3, English, v3Decisions).map(problem => problem.split(":")[0]), ["MIGRATION_DECISION_UNUSED"],
    "once committed, the decisions are removed from the declaration");
  assert.throws(() => planNext(repo.root, LedgerV2, English, []), named("MIGRATION_MODEL", /returns to/), "history only moves forward");
}));

test("widening is what admits every old value: enum, length, range and label limits", () => {
  assert.equal(widens({ kind: "one-of", values: ["a"] }, { kind: "one-of", values: ["a", "b"] }), true);
  assert.equal(widens({ kind: "one-of", values: ["a", "b"] }, { kind: "one-of", values: ["a"] }), false);
  assert.equal(widens({ kind: "length", minimum: 1, maximum: 40 }, { kind: "length", minimum: 0, maximum: 80 }), true);
  assert.equal(widens({ kind: "length", minimum: 1, maximum: 40 }, { kind: "length", minimum: 1 }), true);
  assert.equal(widens({ kind: "length", minimum: 1 }, { kind: "length", minimum: 1, maximum: 40 }), false);
  assert.equal(widens({ kind: "length", minimum: 0, maximum: 40 }, { kind: "length", minimum: 1, maximum: 40 }), false);
  assert.equal(widens({ kind: "between", minimum: 1, maximum: 5 }, { kind: "between", minimum: 0, maximum: 9 }), true);
  assert.equal(widens({ kind: "between", minimum: 1, maximum: 5 }, { kind: "at-least", value: 1 }), true);
  assert.equal(widens({ kind: "greater-than", value: 0 }, { kind: "between", minimum: 1, maximum: 5 }), false);
  assert.equal(widens({ kind: "labels", maxItems: 3, maxLength: 10 }, { kind: "labels", maxItems: 2, maxLength: 10 }), false);
  assert.equal(widens(undefined, { kind: "true" }), false);
  assert.equal(widens({ kind: "pattern", pattern: "^a" }, undefined), true);
});

test("the repository's committed storage history is whole for every stored installation (what storage:check runs)", () => {
  const root = new URL("../", import.meta.url);
  for (const { installation, products, decisions } of storedInstallations) {
    for (const product of products) assert.deepEqual(checkHistory(root, product, installation, decisions[compile(product).id] ?? []), []);
  }
});
