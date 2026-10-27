// Law (plan §15, step 7.3): the history of a product's storage in one installation language is linear and committed: one
// model per generated digest (src/storage/model.ts) and one migration per step (src/storage/migrations.ts), from the first
// generated digest to the current declaration. `plan` adds the next step; `check` proves every committed step is still what
// its two models and recorded decisions generate. Raises MIGRATION_MODEL, MIGRATION_EDITED, MIGRATION_PLAN_MISSING,
// MIGRATION_DECISION_REQUIRED, MIGRATION_DECISION_UNUSED.
import { readdirSync, readFileSync } from "node:fs";
import type { ClientInstallation } from "./client-installation.ts";
import { migrationPath, readMigrations, renderMigration, type Migration } from "./migrations.ts";
import { readModel, renderModel, sha256, storageModel, type StorageModel } from "./model.ts";
import { planMigration } from "./plan.ts";

const generated = "src/storage/generated/";
type History = Readonly<{ models: ReadonlyMap<string, StorageModel>; texts: ReadonlyMap<string, string>; migrations: readonly Migration[] }>;

function readHistory(root: URL, product: string, language: string): History {
  const prefix = `${product}.${language}.`;
  const names = readdirSync(new URL(generated, root)).filter(name => name.startsWith(prefix) && name.endsWith(".json")).sort();
  const models = new Map<string, StorageModel>(), texts = new Map<string, string>();
  for (const name of names) {
    const text = readFileSync(new URL(`${generated}${name}`, root), "utf8");
    const model = readModel(`${generated}${name}`, text);
    models.set(model.digest, model);
    texts.set(model.digest, text);
  }
  const migrations = readMigrations(root).filter(step => step.product === product && step.language === language);
  return { models, texts, migrations };
}

/** The digest the committed history ends at: the one path from the first model, along migrations. A model of `current`
 * that no migration reaches yet is the pending step, not a fork. */
function tipOf(history: History, current: string, where: string): string | undefined {
  const fail = (what: string): never => { throw new Error(`MIGRATION_MODEL: ${where}: ${what}; contract: src/storage/migration-history.ts`); };
  for (const step of history.migrations) {
    if (!history.models.has(step.from) || !history.models.has(step.to)) fail(`${step.path} names a digest without a committed model`);
    if (history.migrations.filter(other => other.from === step.from).length > 1) fail(`two migrations leave ${step.from}`);
    if (history.migrations.filter(other => other.to === step.to).length > 1) fail(`two migrations reach ${step.to}`);
  }
  const reached = new Set(history.migrations.map(step => step.to));
  const roots = [...history.models.keys()].filter(digest => !reached.has(digest) && (digest !== current || history.models.size === 1));
  if (roots.length > 1) fail(`the history has several first models (${roots.join(", ")})`);
  if (history.migrations.some(step => step.from === current)) fail(`the declaration returns to ${current}, an earlier step; history only moves forward, so change it to a new digest`);
  let tip = roots[0];
  const walked = new Set([tip]);
  for (let next = history.migrations.find(step => step.from === tip); next; next = history.migrations.find(step => step.from === tip)) {
    if (walked.has(next.to)) fail(`the migrations loop back to ${next.to}`);
    tip = next.to;
    walked.add(tip);
  }
  if (history.migrations.some(step => !walked.has(step.to))) fail("a migration is on no path from the first model");
  const stray = [...history.models.keys()].filter(digest => !walked.has(digest) && digest !== current);
  if (stray.length) fail(`models ${stray.join(", ")} are on no migration path`);
  return tip;
}

export type PlannedStep = Readonly<{ current: StorageModel; previous?: string; migration?: Readonly<{ path: string; text: string }> }>;

/** The next step for `product` in `installation`, or none when the history already ends at its digest. */
export function planNext(root: URL, product: unknown, installation: ClientInstallation, decisions: readonly unknown[]): PlannedStep {
  const current = storageModel(product, installation);
  const history = readHistory(root, current.product, current.language);
  const previous = tipOf(history, current.digest, `${current.product}.${current.language}`);
  if (previous === undefined || previous === current.digest) {
    if (decisions.length) throw new Error(`MIGRATION_DECISION_UNUSED: ${current.product}.${current.language}: nothing to plan; remove the decisions; contract: src/storage/migration-decisions.ts`);
    return { current, ...(previous === undefined ? {} : { previous }) };
  }
  const from = history.models.get(previous)!;
  const text = renderMigration(from, current, planMigration(from, current, decisions));
  return { current, previous, migration: { path: migrationPath(current.product, current.language, previous, current.digest), text } };
}

/** Every problem of the committed history of `product` in `installation`, as messages; empty when it is whole. */
export function checkHistory(root: URL, product: unknown, installation: ClientInstallation, decisions: readonly unknown[]): readonly string[] {
  const problems: string[] = [];
  const attempt = (run: () => void) => { try { run(); } catch (error) { problems.push(error instanceof Error ? error.message : String(error)); } };
  attempt(() => {
    const current = storageModel(product, installation);
    const history = readHistory(root, current.product, current.language);
    for (const step of history.migrations) attempt(() => {
      const [from, to] = [history.models.get(step.from), history.models.get(step.to)];
      const edited = (what: string) => problems.push(`MIGRATION_EDITED: ${step.path}: ${what}; contract: src/storage/migrations.ts`);
      if (!from || !to) return edited("a model it was planned from is missing");
      if (sha256(history.texts.get(step.from)!) !== step.fromModel || sha256(history.texts.get(step.to)!) !== step.toModel) {
        return edited("a model it was planned from changed since");
      }
      if (renderModel(from) !== history.texts.get(step.from) || renderModel(to) !== history.texts.get(step.to)) return edited("a model file is not in generated form");
      if (planMigration(from, to, step.decisions).body !== step.body) edited("its body differs from what its models and decisions plan");
    });
    const next = planNext(root, product, installation, decisions);
    if (next.migration) problems.push(`MIGRATION_PLAN_MISSING: ${current.product}.${current.language}: no committed migration leads from ${next.previous} to ${current.digest}; run node scripts/storage.ts plan`);
  });
  return problems;
}
