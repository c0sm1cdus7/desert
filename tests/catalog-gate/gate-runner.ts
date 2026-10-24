// Child process: load the gate from the copied tree and run it on that tree, the way the real build does.
// Prints one JSON line: built, rejected (the gate threw) or crashed (the gate could not even load).
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [root, mode] = process.argv.slice(2);
if (!root || !mode) throw new Error("GATE_RUNNER_USAGE: <root> <boundaries|project:human|project:public-catalog>");
const print = (value: object) => console.log(JSON.stringify(value));
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
/** Content rules fail with every violation; the parent compares them with the unmutated tree's. Structural rules throw a message. */
function rejection(error: unknown) {
  const listed = error instanceof Error ? Reflect.get(error, "violations") : undefined;
  const violations = Array.isArray(listed) ? listed.map(item => ({ code: String(item.code), path: String(item.path), what: String(item.what) })) : undefined;
  return { outcome: "rejected", message: message(error).slice(0, 4000), ...(violations ? { violations } : {}) };
}
const causeOf = (error: unknown): unknown => error instanceof Error && error.cause !== undefined ? causeOf(error.cause) : error;
const load = async (relative: string): Promise<Record<string, unknown>> => {
  try { return await import(pathToFileURL(join(root, relative)).href); }
  catch (error) { print({ outcome: "crashed", message: message(error) }); process.exit(0); }
};

async function boundaries() {
  const module = await load("src/authoring/catalog/gate/build-gate.ts");
  const run = module.runWithCatalogGate;
  if (typeof run !== "function") return print({ outcome: "crashed", message: "runWithCatalogGate missing" });
  try { await run(root, async () => "built"); print({ outcome: "built" }); }
  catch (error) { print(rejection(error)); }
}

/** A family's build reaches the worker only after the gate: a rejection must leave no SvelteKit output. */
async function project(family: string) {
  const module = await load("src/build/svelte/project.ts");
  const create = module.createBuildProject;
  if (typeof create !== "function") return print({ outcome: "crashed", message: "createBuildProject missing" });
  const build = create("export {};\n", family);
  try { await build.run("check"); print({ outcome: "built" }); }
  catch (error) {
    const workerRan = existsSync(join(build.directory, ".svelte-kit"));
    if (workerRan) print({ outcome: "crashed", message: `WORKER_RAN_BEFORE_REJECTION: ${message(error)}` });
    else print(rejection(causeOf(error)));
  } finally { build.close(); }
}

if (mode === "boundaries") await boundaries();
else if (mode === "project:human") await project("human");
else if (mode === "project:public-catalog") await project("public-catalog");
else throw new Error(`GATE_RUNNER_MODE: ${mode}`);
