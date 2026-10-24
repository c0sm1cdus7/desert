// The owner's approve command, run only on temporary fixture trees: never on this checkout's ledger (plan L4).
// The fixture holds a copy of scripts/catalog.ts, src/authoring and the modules the gate reads, so the command's root is the fixture.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { contractDigest, sourceDigest } from "../src/authoring/catalog/digest.ts";
import { readCatalogTree, runContentRules } from "../src/authoring/catalog/gate/run.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { CatalogGateViolations } from "../src/authoring/catalog/gate/violation.ts";

const run = promisify(execFile), repository = new URL("..", import.meta.url).pathname;
const catalog = "src/svelte/catalog", fieldCss = `${catalog}/foundations/field/field.css`, ledgerPath = DesertLayout.ledger;
const initialLedger = { version: "desert.catalog-approvals/1", pieces: {
  form: { status: "implemented" },
  field: { status: "implemented", specimens: { "value|measure=compact": "proposed" } },
  theme: { status: "implemented" },
  meter: { status: "proposed", proposedOn: "2026-10-23", reason: "Home chart" },
} };
const fixture: Readonly<Record<string, string>> = {
  [`${catalog}/foundations/field/field.catalog.ts`]: `export const F = defineFoundation({ id: "field", purpose: "x",
  owner: { entry: "Field.svelte", parts: ["field.css"], vendor: ["input"] }, shape: "radius", states: ["empty", "value"],
  variants: { measure: ["writing", "compact"] }, approval: "required", contract: C } as const);\n`,
  [`${catalog}/foundations/field/field.contract.ts`]: "export const C = {} as const;\n",
  [`${catalog}/foundations/field/Field.svelte`]: "<span></span>\n",
  [fieldCss]: ".field { padding: 1rem; }\n",
  "src/svelte/vendor/components/ui/input/input.svelte": "<input />\n",
  [`${catalog}/compositions/form/form.catalog.ts`]: `export const K = defineComposition({ id: "form", purpose: "x",
  owner: { entry: "Form.svelte" }, uses: ["field"], approval: "required", contract: C } as const);\n`,
  [`${catalog}/compositions/form/form.contract.ts`]: "export const C = {} as const;\n",
  [`${catalog}/compositions/form/Form.svelte`]: '<script lang="ts">import { Field } from "../../index.ts";</script><Field measure="compact" />\n',
  [`${catalog}/index.ts`]: 'export { default as Field } from "./foundations/field/Field.svelte";\n',
  [`${catalog}/mechanisms/theme/theme.mechanism.ts`]: 'export const T = defineMechanism({ id: "theme", owner: "theme", files: ["tokens.css"] } as const);\n',
  [`${catalog}/mechanisms/theme/tokens.css`]: ":root { --radius-well: 1rem; }\n",
  "src/svelte/theme.css": '@import "./catalog/mechanisms/theme/tokens.css";\n',
  [ledgerPath]: `${JSON.stringify(initialLedger, null, 2)}\n`,
};

async function withFixture(body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "desert-approve-"));
  try {
    // The gate reads the resolved-node grammar (rule B) and the renderer contracts (rule D2, a required gate source) from the SDK.
    // The SDK's nonvisual modules come from this tree; the visual roots are the fixture's own.
    const sdk = (await readdir(join(repository, "src"))).map(name => `src/${name}`).filter(path => !DesertLayout.roots.some(root => root === path || root.startsWith(`${path}/`)));
    for (const path of ["scripts/catalog.ts", ...sdk, DesertLayout.rendererTypes, ...DesertLayout.gate.reads]) await cp(join(repository, path), join(root, path), { recursive: true });
    await symlink(join(repository, "node_modules"), join(root, "node_modules"));
    await writeFile(join(root, "package.json"), '{ "type": "module" }\n');
    for (const [path, text] of Object.entries(fixture)) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }
    await body(root);
  } finally { await rm(root, { recursive: true }); }
}

const catalogCommand = (root: string, ...args: string[]) => run(process.execPath, [join(root, "scripts/catalog.ts"), ...args], { cwd: root });
const refused = async (root: string, args: readonly string[], expected: RegExp) => {
  const before = await readFile(join(root, ledgerPath), "utf8");
  await assert.rejects(catalogCommand(root, ...args), (error: unknown) => error instanceof Error && expected.test(String(Reflect.get(error, "stderr"))));
  assert.equal(await readFile(join(root, ledgerPath), "utf8"), before, "a refused approval leaves the ledger byte-identical");
};
const ledgerOf = async (root: string) => JSON.parse(await readFile(join(root, ledgerPath), "utf8"));
const l2 = async (root: string) => {
  try { await runContentRules(root, await readCatalogTree(root, DesertLayout), { layout: DesertLayout, rules: ["L2"] }); return []; }
  catch (error) { if (error instanceof CatalogGateViolations) return error.violations.map(item => `${item.code} ${item.what}`); throw error; }
};
const localToday = () => { const now = new Date(), pad = (n: number) => String(n).padStart(2, "0"); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; };

test("approve stamps what the gate recomputes, keeps every other entry, and writes the ledger's own format", async () => {
  await withFixture(async root => {
    const { stdout } = await catalogCommand(root, "approve", "field", "theme", "--specimen", "field:empty|measure=writing");
    const tree = await readCatalogTree(root, DesertLayout), digestTree = { layout: DesertLayout, paths: tree.paths, declarations: tree.declarations };
    const read = (path: string) => Buffer.from(fixture[path] ?? "", "utf8"), present = (path: string) => path in fixture ? read(path) : undefined;
    const ledger = await ledgerOf(root);
    assert.deepEqual(Object.keys(ledger.pieces), ["form", "field", "theme", "meter"]);
    assert.deepEqual(ledger.pieces.field, { status: "approved", sourceDigest: sourceDigest(digestTree, "field", present),
      contractDigest: contractDigest(digestTree, "field", present), approvedOn: localToday(), approvedBy: "owner",
      specimens: { "value|measure=compact": "proposed", "empty|measure=writing": "approved" } });
    assert.equal(ledger.pieces.theme.sourceDigest, sourceDigest(digestTree, "theme", present));
    assert.deepEqual([ledger.pieces.form, ledger.pieces.meter], [initialLedger.pieces.form, initialLedger.pieces.meter]);
    assert.equal(await readFile(join(root, ledgerPath), "utf8"), `${JSON.stringify(ledger, null, 2)}\n`);
    assert.match(stdout, /approved field on \d{4}-\d{2}-\d{2}\n {2}source {3}[a-f0-9]{64}\n {2}contract [a-f0-9]{64}\n {2}specimen empty\|measure=writing approved/);
    assert.match(stdout, /approved theme/);

    const compact = 'PIECE_NOT_APPROVED <Field> passes measure="compact" to field, a specimen value that is not approved';
    assert.deepEqual(await l2(root), [compact], "the gate recomputes the stamped digests; only the proposed specimen value remains");
    assert.match((await catalogCommand(root, "status")).stdout, /^field\tapproved\tdigests match$/m);
    await writeFile(join(root, fieldCss), ".field { padding: 2rem; }\n");
    assert.deepEqual(await l2(root), [compact, `FOUNDATION_UNAPPROVED_CHANGE field: the source digest differs from the approved one (${localToday()})`]);
    const status = (await catalogCommand(root, "status")).stdout;
    assert.match(status, /^field\tapproved\tsource digest changed since approval$/m);
    assert.match(status, /^theme\tapproved\tdigests match$/m);
    assert.match(status, /^form\timplemented$/m);
  });
});

test("approving a composition makes its unapproved specimen values and pieces findings of the gate", async () => {
  await withFixture(async root => {
    await catalogCommand(root, "approve", "form");
    assert.deepEqual(await l2(root), ["PIECE_NOT_APPROVED form (approved) mounts field, which is implemented"]);
    await catalogCommand(root, "approve", "field", "theme", "--specimen", "field:empty|measure=writing");
    assert.deepEqual(await l2(root), ['PIECE_NOT_APPROVED <Field> passes measure="compact" to field, a specimen value that is not approved']);
    await catalogCommand(root, "approve", "field", "--specimen", "field:value|measure=compact");
    assert.deepEqual(await l2(root), []);
    assert.equal((await ledgerOf(root)).pieces.field.specimens["value|measure=compact"], "approved");
  });
});

test("approve refuses unknown ids, undeclared proposed pieces, stray specimens and malformed requests", async () => {
  await withFixture(async root => {
    await refused(root, ["approve", "ghost"], /CATALOG_APPROVE: ghost is not a piece of the catalog/);
    await refused(root, ["approve", "meter"], /CATALOG_APPROVE: meter is proposed and not declared yet/);
    await refused(root, ["approve", "field", "ghost"], /ghost is not a piece/);
    await refused(root, ["approve", "field", "--specimen", "form:empty"], /form:… names a piece this command does not approve/);
    await refused(root, ["approve", "field", "--specimen", "field:loading"], /loading is not a declared state of field/);
    await refused(root, ["approve", "field", "--specimen", "field:empty|measure=huge"], /measure=huge is not a declared variant/);
    await refused(root, ["approve", "field", "--specimen", "field:empty|zeta=a,measure=writing"], /axes sorted/);
    await refused(root, ["approve"], /CATALOG_USAGE/);
    await refused(root, ["approve", "field", "--specimen"], /CATALOG_USAGE/);
    await refused(root, ["approve", "--force", "field"], /CATALOG_USAGE/);
    await refused(root, ["status", "extra"], /CATALOG_USAGE/);
  });
});
