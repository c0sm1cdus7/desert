// Runs the visual gate exactly as the real build does: the SDK code of a tree checks that same tree.
// Each observation copies src/, applies one mutation, and runs the copy's own gate in a child process.
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, symlink, unlink, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const sdkRoot = fileURLToPath(new URL("../../", import.meta.url));
const runner = fileURLToPath(new URL("./gate-runner.ts", import.meta.url));

export const GateOutcomeSchema = Type.Union([
  Type.Object({ outcome: Type.Literal("built") }, { additionalProperties: false }),
  Type.Object({ outcome: Type.Literal("rejected"), message: Type.String() }, { additionalProperties: false }),
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
      { cwd: tree.root, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
    return parseOutcome(stdout);
  } finally { await rm(tree.root, { recursive: true, force: true }); }
}
