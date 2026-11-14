import { registerHooks } from "node:module";
registerHooks({
  load(url, context, nextLoad) {
    if (url === new URL("../../src/adapters/secrets/secret-vault.ts", import.meta.url).href) {
      return {
        format: "module",
        shortCircuit: true,
        source: [
          `import { Redactor } from ${JSON.stringify(new URL("redact.ts", url).href)};`,
          "export class SecretVault extends Redactor {",
          "  constructor(_file, schema) { super(schema, () => { throw new Error('This reproduction keeps no secret'); }); }",
          "  close() {}",
          "}",
        ].join("\n"),
      };
    }
    return nextLoad(url, context);
  },
});
