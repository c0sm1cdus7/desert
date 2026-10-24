// The ledger side of the evidence: `node scripts/catalog.ts status` filtered to the requested ids, and the two digests the
// owner's approve command would stamp for each id now. The digests come from digest.ts over the bytes on disk, the same
// functions and the same (path → bytes) reading the approve command uses; tests/tools/catalog-evidence.test.ts proves the
// equality by running approve in a temporary copy of the tree.
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { contractDigest, contractFiles, sourceDigest, sourceFiles, type DigestTree } from "../../../src/authoring/catalog/digest.ts";
import { assertLedgerStructure } from "../../../src/authoring/catalog/gate/ledger.ts";
import type { CatalogTree } from "../../../src/authoring/catalog/gate/run.ts";
import { DesertLayout } from "../../../src/authoring/catalog/layout.ts";
import type { PieceApproval } from "../../../src/authoring/catalog/approvals-schema.ts";

export type PieceStatus = Readonly<{ id: string; entry: PieceApproval; sourceDigest: string; contractDigest: string;
  /** The lines `node scripts/catalog.ts status` prints for this id. */
  lines: readonly string[] }>;

const digestTree = (tree: CatalogTree): DigestTree => ({ layout: DesertLayout, paths: tree.paths, declarations: tree.declarations });

/** The status command's output, split into one block per id (the id line and its indented specimen lines). */
async function statusBlocks(root: string): Promise<ReadonlyMap<string, readonly string[]>> {
  const { stdout } = await promisify(execFile)(process.execPath, [join(root, "scripts/catalog.ts"), "status"], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  const blocks = new Map<string, string[]>();
  let current: string[] | undefined;
  for (const line of stdout.split("\n")) {
    if (!line) continue;
    if (line.startsWith(" ")) { current?.push(line); continue; }
    current = [line];
    blocks.set(line.split("\t")[0] ?? line, current);
  }
  return blocks;
}

export async function readStatuses(root: string, tree: CatalogTree, ids: readonly string[]): Promise<readonly PieceStatus[]> {
  const ledger = assertLedgerStructure(tree.ledger, tree.declarations), blocks = await statusBlocks(root);
  const present = new Set(tree.paths), bytes = new Map<string, Uint8Array>();
  for (const id of ids) for (const path of [...sourceFiles(digestTree(tree), id), ...contractFiles(digestTree(tree), id)]) {
    if (present.has(path) && !bytes.has(path)) bytes.set(path, await readFile(join(root, path)));
  }
  const read = (path: string) => bytes.get(path);
  return ids.map(id => {
    const lines = blocks.get(id);
    if (!lines) throw new Error(`EVIDENCE_STATUS: node scripts/catalog.ts status printed no line for ${id}`);
    return { id, entry: ledger.pieces[id] ?? { status: "implemented" }, lines,
      sourceDigest: sourceDigest(digestTree(tree), id, read), contractDigest: contractDigest(digestTree(tree), id, read) };
  });
}

/** What the tool prints: the status lines, then the digests an approval would stamp now. */
export function formatStatuses(statuses: readonly PieceStatus[]): string {
  return statuses.map(status => [...status.lines, `  approve would stamp  source   ${status.sourceDigest}`,
    `  approve would stamp  contract ${status.contractDigest}`].join("\n")).join("\n");
}
