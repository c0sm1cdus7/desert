// The Visual Catalog command: node scripts/catalog.ts --write | --check | status | approve <id>... [--specimen <id>:<key>]...
//   --write   regenerate the catalog index, manifest and types from the declarations
//   --check   regenerate in memory and compare (rule C), the same comparison the build runs
//   status    the ledger status of every piece and specimen; for an approved piece, whether its digests still match
//   approve   THE OWNER'S COMMAND ONLY: recompute both digests of each id and stamp it approved in the ledger, with the
//             listed specimens approved. It is the only writer of approvals.json; no agent runs it (plan L4).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { Approvals, PieceApproval } from "../src/authoring/catalog/approvals-schema.ts";
import { contractDigest, contractFiles, sourceDigest, sourceFiles, themeMechanism, type DigestTree, type ReadBytes } from "../src/authoring/catalog/digest.ts";
import { generateCatalog } from "../src/authoring/catalog/generate.ts";
import { assertLedgerStructure } from "../src/authoring/catalog/gate/ledger.ts";
import { readCatalogTree, runCatalogGate, type CatalogTree } from "../src/authoring/catalog/gate/run.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";

const root = resolve(import.meta.dirname, "..");
const usage = "CATALOG_USAGE: --write | --check | status | approve <id>... [--specimen <id>:<key>]...";
const [command, ...rest] = process.argv.slice(2);
if (!command || !["--write", "--check", "status", "approve"].includes(command) || command !== "approve" && rest.length) throw new Error(usage);

const refuse = (what: string): never => { throw new Error(`CATALOG_APPROVE: ${what}`); };
const digestTree = (tree: CatalogTree): DigestTree => ({ layout: DesertLayout, paths: tree.paths, declarations: tree.declarations });

/** Reads, from disk, the bytes of every file the digests of these ids cover; a path outside the tree reads as absent. */
async function bytesFor(tree: CatalogTree, ids: readonly string[]): Promise<ReadBytes> {
  const present = new Set(tree.paths), bytes = new Map<string, Uint8Array>();
  for (const id of ids) for (const path of [...sourceFiles(digestTree(tree), id), ...contractFiles(digestTree(tree), id)]) {
    if (present.has(path) && !bytes.has(path)) bytes.set(path, await readFile(join(root, path)));
  }
  return path => bytes.get(path);
}

function today(): string {
  const now = new Date(), pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

type Request = Readonly<{ ids: readonly string[]; specimens: ReadonlyMap<string, readonly string[]> }>;

function parseApproval(args: readonly string[]): Request {
  const ids: string[] = [], specimens = new Map<string, string[]>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg !== "--specimen") { if (arg.startsWith("-")) throw new Error(usage); ids.push(arg); continue; }
    const value = args[index += 1] ?? "", colon = value.indexOf(":");
    if (colon <= 0) throw new Error(usage);
    const id = value.slice(0, colon);
    specimens.set(id, [...specimens.get(id) ?? [], value.slice(colon + 1)]);
  }
  if (!ids.length) throw new Error(usage);
  for (const id of specimens.keys()) if (!ids.includes(id)) refuse(`--specimen ${id}:… names a piece this command does not approve`);
  return { ids: [...new Set(ids)], specimens };
}

/** A declared piece, or the theme, with a ledger entry; never an unknown id or a proposed piece not declared yet. */
function assertApprovable(tree: CatalogTree, ledger: Approvals, id: string): void {
  const declared = tree.declarations.find(item => item.declaration.id === id);
  const entry = ledger.pieces[id];
  if (!declared && entry?.status === "proposed") refuse(`${id} is proposed and not declared yet; declare it before approving it`);
  if (!declared || !entry || declared.declaration.kind === "mechanism" && id !== themeMechanism) refuse(`${id} is not a piece of the catalog`);
}

/** `<state>|<axis>=<value>,...` with axes sorted, naming a declared state and declared variant values. */
function assertSpecimenKey(tree: CatalogTree, id: string, key: string): void {
  const declaration = tree.declarations.find(item => item.declaration.id === id)?.declaration;
  const [state = "", axes, ...extra] = key.split("|"), pairs = axes === undefined ? [] : axes.split(",").map(pair => pair.split("="));
  const names = pairs.map(([axis]) => axis ?? "");
  if (extra.length || names.some((name, index) => index > 0 && (names[index - 1] ?? "") >= name)) refuse(`${id}:${key} is not <state>|<axis>=<value>,... with axes sorted`);
  if (declaration?.kind !== "foundation") return;
  if (!declaration.states.includes(state)) refuse(`${id}:${key}: ${state} is not a declared state of ${id}`);
  for (const [axis = "", value = "", ...more] of pairs) {
    if (more.length || !declaration.variants?.[axis]?.includes(value)) refuse(`${id}:${key}: ${axis}=${value} is not a declared variant of ${id}`);
  }
}

function stamped(previous: PieceApproval | undefined, digests: Readonly<{ source: string; contract: string }>, keys: readonly string[], on: string): PieceApproval {
  const specimens: Record<string, "proposed" | "approved"> = { ...previous && "specimens" in previous ? previous.specimens : {} };
  for (const key of keys) specimens[key] = "approved";
  return { status: "approved", sourceDigest: digests.source, contractDigest: digests.contract, approvedOn: on, approvedBy: "owner",
    ...Object.keys(specimens).length ? { specimens } : {} };
}

async function approve(args: readonly string[]): Promise<void> {
  const request = parseApproval(args), tree = await readCatalogTree(root, DesertLayout);
  const ledger = assertLedgerStructure(tree.ledger, tree.declarations), on = today();
  for (const id of request.ids) assertApprovable(tree, ledger, id);
  for (const [id, keys] of request.specimens) for (const key of keys) assertSpecimenKey(tree, id, key);
  const read = await bytesFor(tree, request.ids), entries = new Map<string, PieceApproval>();
  for (const id of request.ids) {
    const digests = { source: sourceDigest(digestTree(tree), id, read), contract: contractDigest(digestTree(tree), id, read) };
    entries.set(id, stamped(ledger.pieces[id], digests, request.specimens.get(id) ?? [], on));
  }
  const next = { ...ledger, pieces: Object.fromEntries(Object.entries(ledger.pieces).map(([id, entry]) => [id, entries.get(id) ?? entry])) };
  assertLedgerStructure(next, tree.declarations);
  await writeFile(join(root, DesertLayout.ledger), `${JSON.stringify(next, null, 2)}\n`);
  for (const [id, entry] of entries) if (entry.status === "approved") {
    console.log(`approved ${id} on ${entry.approvedOn}\n  source   ${entry.sourceDigest}\n  contract ${entry.contractDigest}`);
    for (const key of request.specimens.get(id) ?? []) console.log(`  specimen ${key} approved`);
  }
}

async function status(): Promise<void> {
  const tree = await readCatalogTree(root, DesertLayout), ledger = assertLedgerStructure(tree.ledger, tree.declarations);
  const approvedIds = Object.entries(ledger.pieces).filter(([, entry]) => entry.status === "approved").map(([id]) => id);
  const read = await bytesFor(tree, approvedIds);
  for (const [id, entry] of Object.entries(ledger.pieces).sort(([left], [right]) => left < right ? -1 : 1)) {
    const changed = entry.status !== "approved" ? [] : [
      ...sourceDigest(digestTree(tree), id, read) === entry.sourceDigest ? [] : ["source"],
      ...contractDigest(digestTree(tree), id, read) === entry.contractDigest ? [] : ["contract"]];
    const verdict = entry.status !== "approved" ? "" : changed.length ? `\t${changed.join(" and ")} digest changed since approval` : "\tdigests match";
    console.log(`${id}\t${entry.status}${verdict}`);
    const specimens = "specimens" in entry ? entry.specimens ?? {} : {};
    for (const [specimen, specimenStatus] of Object.entries(specimens)) console.log(`  ${specimen}\t${specimenStatus}`);
  }
}

if (command === "--write") {
  const tree = await readCatalogTree(root, DesertLayout);
  for (const file of generateCatalog(tree, DesertLayout)) {
    await mkdir(dirname(resolve(root, file.path)), { recursive: true });
    await writeFile(resolve(root, file.path), file.source);
  }
}
if (command === "--write" || command === "--check") {
  const tree = await runCatalogGate(root, { layout: DesertLayout, rules: ["C"] });
  console.log(`Catalog ${command === "--write" ? "generated and checked" : "checked"}: ${tree.declarations.length} declarations.`);
}
if (command === "status") await status();
if (command === "approve") await approve(rest);
