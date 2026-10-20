import { registerHooks } from "node:module";
const target = new URL("./journey-runtime.ts", import.meta.url).href;
const original = "const database = await cluster.database();";
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (url !== target) return result;
    const source = String(result.source);
    if (source.split(original).length !== 2) throw new Error("SETUP_TARGET_CHANGED");
    return { ...result, source: source.replace(original, 'throw new Error("FIXTURE_SETUP_BLOCKED");\n' + original) };
  },
});
