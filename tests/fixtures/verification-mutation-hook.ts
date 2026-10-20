import { registerHooks } from "node:module";

const target = new URL("../../src/local/effects.ts", import.meta.url).href;
const original = "const facts = { ...(record?.facts ?? {}), ...changes };";
const mode = process.env.DESERT_VERIFICATION_MUTATION;
const mutations: Record<string, [string, string]> = {
  preservation: [original, original + `
    if (command.kind === "update") {
      const field = Object.keys(record!.facts).find(key => !Object.hasOwn(command.set, key)
        && key !== program.owners.get(command.object) && typeof record!.facts[key] === "string");
      if (field) facts[field] = "CORRUPTED";
    }`],
  owner: [original, original + `
    if (command.kind === "update") facts[program.owners.get(command.object)!] = "wrong-owner";`],
  guard: ['if (!matchesConditions(record.facts, command.when)) throw new Error("PRECONDITION_FAILED");', ""],
};
const mutation = mutations[mode ?? ""];
if (!mutation) throw new Error("UNKNOWN_VERIFICATION_MUTATION");
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (url !== target) return result;
    const source = String(result.source);
    if (source.split(mutation[0]).length !== 2) throw new Error("MUTATION_TARGET_CHANGED");
    return { ...result, source: source.replace(mutation[0], mutation[1]) };
  },
});
