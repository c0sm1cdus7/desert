// Opens only a synthetic journal on a real terminal; the vault is replaced before runtime imports.
import { registerHooks } from "node:module";
registerHooks({
  load(url, context, next) {
    if (url.endsWith("/keychain/secret-vault.ts"))
      return {
        format: "module",
        shortCircuit: true,
        source: `import { Redactor } from "./redact.ts";
export class SecretVault extends Redactor {
  constructor(_file, schema) { super(schema, () => { throw new Error("No secrets in this fixture"); }); }
  close() {}
}`,
      };
    return next(url, context);
  },
});
const { startHouse, localPorts } = await import("../../src/runtime/house-runtime.ts");
const { houseRouter } = await import("../../src/surface/bridge/assembly/house-router.ts");
const { startTerminal } = await import("../../src/doors/terminal/boot.ts");
const { shopProgram, shopShown } = await import("./shop.ts");
const home = process.argv[2];
if (!home) throw new Error("Missing fixture home");
const house = startHouse(
  home,
  {
    ...shopProgram,
    projectionVersion: process.argv[3] ?? "shop/1",
    by: "shop",
    creation: {
      admin: "ana",
      language: "es",
      assignments: [{ identity: "ana", tools: ["sales", "payments"], language: "es" }],
    },
  },
  { now: () => 1000, wait: () => () => {} },
);
const router = houseRouter(localPorts(house, "ana", { recentLines: 40 }), shopShown);
try {
  await startTerminal(process.stdout, process.stdin, router);
} finally {
  router.stop();
  house.close();
}
