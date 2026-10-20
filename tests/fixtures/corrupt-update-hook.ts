import { registerHooks } from "node:module";

// Fault injection only in an explicitly launched test subprocess; no source writes.
const target = new URL("../../src/local/effects.ts", import.meta.url).href;
const original = "const facts = { ...(record?.facts ?? {}), ...changes };";
const corrupted = `${original}\n  if (command.kind === "update") facts.body = "Corrupted by interpreter";`;
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (url !== target) return result;
    const source = String(result.source);
    if (source.split(original).length !== 2) throw new Error("MUTATION_TARGET_CHANGED");
    return { ...result, source: source.replace(original, corrupted) };
  },
});
