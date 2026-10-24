// Runs the visual gate exactly as the real build does: the SDK code of a tree checks that same tree.
// Each observation copies src/, applies one mutation, and runs the copy's own gate in a child process.
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, symlink, unlink, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { generateCatalog } from "../../src/authoring/catalog/generate.ts";
import { contractDigest, sourceDigest } from "../../src/authoring/catalog/digest.ts";
import { readCatalogTree } from "../../src/authoring/catalog/gate/run.ts";
import { DesertLayout } from "../../src/authoring/catalog/layout.ts";

const sdkRoot = fileURLToPath(new URL("../../", import.meta.url));
const runner = fileURLToPath(new URL("./gate-runner.ts", import.meta.url));

export const GateOutcomeSchema = Type.Union([
  Type.Object({ outcome: Type.Literal("built") }, { additionalProperties: false }),
  Type.Object({ outcome: Type.Literal("rejected"), message: Type.String(),
    violations: Type.Optional(Type.Array(Type.Object({ code: Type.String(), path: Type.String(), what: Type.String() }, { additionalProperties: false }))) },
  { additionalProperties: false }),
  Type.Object({ outcome: Type.Literal("crashed"), message: Type.String() }, { additionalProperties: false }),
]);
export type GateOutcome = Static<typeof GateOutcomeSchema>;
export type GateMode = "boundaries" | "project:human" | "project:public-catalog";
export type Mutation = (tree: SourceTree) => Promise<void>;

/** The mutable copy a case edits. Every edit fails loudly when its anchor is absent:
 * a mutation that silently changes nothing would make a red test meaningless. */
export class SourceTree {
  readonly root: string;
  constructor(root: string) { this.root = root; }
  path(relative: string) { return join(this.root, relative); }
  async replace(relative: string, anchor: string, replacement: string) {
    const source = await readFile(this.path(relative), "utf8");
    if (!source.includes(anchor)) throw new Error(`MUTATION_ANCHOR_MISSING: ${relative}: ${anchor}`);
    await writeFile(this.path(relative), source.replace(anchor, replacement));
  }
  async append(relative: string, text: string) {
    await writeFile(this.path(relative), (await readFile(this.path(relative), "utf8")) + text);
  }
  async create(relative: string, content: string | Uint8Array) {
    await mkdir(dirname(this.path(relative)), { recursive: true });
    await writeFile(this.path(relative), content, { flag: "wx" });
  }
  async remove(relative: string) { await unlink(this.path(relative)); }
  async link(target: string, relative: string) { await symlink(this.path(target), this.path(relative)); }
  /** What the owner's `approve` stamps, on the copy's ledger only (never the real one): the digests the gate recomputes.
   * `digests` overrides a value, for the case of a hand-set digest. */
  async approveInCopy(id: string, digests: Readonly<{ source?: string; contract?: string }> = {}) {
    const tree = await readCatalogTree(this.root, DesertLayout), read = (path: string) => {
      try { return new Uint8Array(readFileSync(this.path(path))); } catch { return undefined; }
    };
    const digestTree = { layout: DesertLayout, paths: tree.paths, declarations: tree.declarations };
    const ledger = JSON.parse(await readFile(this.path(DesertLayout.ledger), "utf8"));
    ledger.pieces[id] = { status: "approved", sourceDigest: digests.source ?? sourceDigest(digestTree, id, read),
      contractDigest: digests.contract ?? contractDigest(digestTree, id, read), approvedOn: "2026-10-23", approvedBy: "owner" };
    await writeFile(this.path(DesertLayout.ledger), `${JSON.stringify(ledger, null, 2)}\n`);
  }
  /** What `node scripts/catalog.ts --write` does, on the copy: so a case can change a declaration without a derivation error. */
  async regenerateCatalog() {
    for (const file of generateCatalog(await readCatalogTree(this.root, DesertLayout), DesertLayout)) {
      await writeFile(this.path(file.path), file.source);
    }
  }
}

async function copyOfSdk(): Promise<SourceTree> {
  const root = await mkdtemp(join(tmpdir(), "desert-catalog-gate-"));
  await cp(join(sdkRoot, "src"), join(root, "src"), { recursive: true, verbatimSymlinks: true });
  await cp(join(sdkRoot, "package.json"), join(root, "package.json"));
  await cp(join(sdkRoot, "package-lock.json"), join(root, "package-lock.json"));
  await symlink(join(sdkRoot, "node_modules"), join(root, "node_modules"), "dir");
  return new SourceTree(root);
}

function parseOutcome(stdout: string): GateOutcome {
  const line = stdout.trim().split("\n").at(-1) ?? "";
  const value: unknown = JSON.parse(line);
  if (!Value.Check(GateOutcomeSchema, value)) throw new Error(`GATE_RUNNER_PROTOCOL: ${line}`);
  return value;
}

export async function observeGate(mutate: Mutation, mode: GateMode = "boundaries"): Promise<GateOutcome> {
  const tree = await copyOfSdk();
  try {
    await mutate(tree);
    const { stdout } = await promisify(execFile)(process.execPath, [runner, tree.root, mode],
      { cwd: tree.root, timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    return parseOutcome(stdout);
  } finally { await rm(tree.root, { recursive: true, force: true }); }
}

const baselines = new Map<GateMode, Promise<GateOutcome>>();
/** The unmutated tree, observed once per mode: under the strict build (Q1) it carries today's violations. */
export const baselineOf = (mode: GateMode = "boundaries") => {
  const known = baselines.get(mode);
  if (known) return known;
  const observed = observeGate(async () => {}, mode);
  baselines.set(mode, observed);
  return observed;
};

const key = (item: Readonly<{ code: string; path: string; what: string }>) => `${item.code}\u0000${item.path}\u0000${item.what}`;
/** Violations of `result` that the baseline does not have, as a multiset (a second identical violation is new). */
export function addedViolations(result: GateOutcome, baseline: GateOutcome) {
  if (result.outcome !== "rejected" || !result.violations) return undefined;
  const remaining = new Map<string, number>();
  for (const item of baseline.outcome === "rejected" ? baseline.violations ?? [] : []) remaining.set(key(item), (remaining.get(key(item)) ?? 0) + 1);
  return result.violations.filter(item => {
    const left = remaining.get(key(item)) ?? 0;
    if (left > 0) { remaining.set(key(item), left - 1); return false; }
    return true;
  });
}
