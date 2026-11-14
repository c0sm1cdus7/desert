import { registerHooks } from "node:module";
registerHooks({
  load(url, context, nextLoad) {
    if (url === new URL("../../src/adapters/secrets/secret-vault.ts", import.meta.url).href) {
      return {
        format: "module",
        shortCircuit: true,
        source: "export class SecretVault { capture() {} scrub(value) { return value; } close() {} }",
      };
    }
    return nextLoad(url, context);
  },
});
