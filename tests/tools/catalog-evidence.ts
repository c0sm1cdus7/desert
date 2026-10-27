// Approval evidence for the owner (plan §8): every specimen of the listed pieces, rendered by the piece's own owner in the
// test-only evidence build (theme.css and Tailwind, temp dir, no manifest), at 390 and 1280 px in light and dark, plus the
// Visual Catalog pages that show each piece, the ledger status and the digests an approval would stamp.
//   node tests/tools/catalog-evidence.ts --label <label> <id>...
//   node tests/tools/catalog-evidence.ts --label <label> --all
// Output: .local/catalog-evidence/<label>/<id>/<specimen-key>.png and .local/catalog-evidence/<label>/index.html (open this).
// The evidence project runs only under node:test, so this command re-runs itself as one node:test file.
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import test from "node:test";
import { runEvidence } from "./catalog-evidence/run.ts";

const root = resolve(import.meta.dirname, "../.."), variable = "DESERT_CATALOG_EVIDENCE";
const usage = "CATALOG_EVIDENCE_USAGE: node tests/tools/catalog-evidence.ts --label <label> (<id>... | --all)";
type Arguments = Readonly<{ label: string; ids: readonly string[] | "all" }>;

export const evidenceOutput = (label: string) => join(root, ".local/catalog-evidence", label);

function parse(args: readonly string[]): Arguments {
  let label: string | undefined, all = false;
  const ids: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index] ?? "";
    if (arg === "--label") label = args[++index];
    else if (arg === "--all") all = true;
    else if (arg.startsWith("-")) throw new Error(usage);
    else ids.push(arg);
  }
  if (!label || !/^[a-z0-9][a-z0-9._-]*$/i.test(label) || all === ids.length > 0) throw new Error(usage);
  return { label, ids: all ? "all" : ids };
}
function fromEnvironment(value: string): Arguments {
  const read: unknown = JSON.parse(value);
  if (typeof read !== "object" || read === null) throw new Error(usage);
  const label = Reflect.get(read, "label"), ids = Reflect.get(read, "ids");
  if (typeof label !== "string" || !(ids === "all" || Array.isArray(ids) && ids.every(id => typeof id === "string"))) throw new Error(usage);
  return parse(["--label", label, ...ids === "all" ? ["--all"] : ids]);
}

const requested = process.env[variable];
if (process.env.NODE_TEST_CONTEXT === undefined && import.meta.main) {
  const args = parse(process.argv.slice(2));
  const child = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "--test-timeout=7200000", import.meta.filename],
    { cwd: root, stdio: "inherit", env: { ...process.env, [variable]: JSON.stringify(args) } });
  process.exit(child.status ?? 1);
} else if (requested !== undefined) {
  test("catalog evidence", { timeout: 7_200_000 }, async () => {
    const args = fromEnvironment(requested);
    const result = await runEvidence({ root, output: evidenceOutput(args.label), label: args.label, ids: args.ids });
    console.log(result.status);
    for (const count of result.counts) {
      console.log(`${count.id}\t${count.rendered}/${count.specimens} specimens\t${count.catalogRendered}/${count.catalogPages} Visual Catalog pages`);
      for (const failure of count.failed) console.log(`  not rendered: ${failure}`);
      if (count.unanswered.length) console.log(`  the build did not answer: ${count.unanswered.join(", ")}`);
    }
    const total = result.counts.reduce((sum, count) => sum + count.specimens, 0), rendered = result.counts.reduce((sum, count) => sum + count.rendered, 0);
    console.log(`\n${result.counts.length} pieces, ${rendered}/${total} specimens rendered\nOpen ${result.index}`);
  });
}
