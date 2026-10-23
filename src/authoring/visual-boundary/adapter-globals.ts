import { compile } from "svelte/compiler";
import { assertRuntimeGlobals } from "./runtime-globals.ts";

/** Check emitted runtime references, so template closures share their real lexical
 * scope and type-only HTMLElement/declare syntax cannot alter the result.
 * Runtime acquisition and known evaluator/reflection channels share one rule
 * with helper modules. Dependency traversal is enforced separately; this is not
 * an arbitrary JavaScript information-flow proof or hostile-code sandbox.
 */
export function assertNoAdapterGlobals(path: string, source: string, fail: (reason: string) => never): void {
  const code = compile(source, { filename: path, generate: "client", dev: false }).js.code;
  assertRuntimeGlobals(code, new Set(), name => fail(`adapter runtime global: ${name}`));
}
