// Real terminal fixture, with only invented material and an isolated synthetic custody file.
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
registerHooks({
  load(url, context, next) {
    if (url.endsWith("/src/programs/house-resources.ts"))
      return {
        format: "module-typescript",
        shortCircuit: true,
        source: readFileSync(new URL(url), "utf8").replace('"secrets.sqlite"', '"fixture.sqlite"'),
      };
    return next(url, context);
  },
});
const { opacityProgram } = await import("./opacity-program.ts");
const { shopShown } = await import("./shop.ts");
const { MemoryHouseKeys } = await import("../../src/adapters/secrets/custody/house-keys.ts");
const { startHouse, localPorts } = await import("../../src/programs/house-runtime.ts");
const { houseRouter } = await import("../../src/surface/bridge/house-router.ts");
const { startTerminal } = await import("../../src/doors/terminal/boot.ts");
const home = process.argv[2];
if (!home) throw new Error("Falta carpeta temporal");
const { Type } = await import("@sinclair/typebox");
const bounded = Type.Object({
  first: Type.String({ secret: true, title: "Primer material", minLength: 8, maxLength: 13, pattern: "^x+$" }),
});
const program = opacityProgram(process.argv[3] === "bounded" ? bounded : undefined);
const house = startHouse(home, {
  ...program,
  by: "shop",
  secretKeys: new MemoryHouseKeys(),
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: program.registry.map(tool => tool.id) }] },
});
const shown = {
  ...shopShown,
  words: {
    ...shopShown.words,
    vault: { name: "Custodia", key: "c", empty: "Sin materiales", listed: "Materiales", reads: {}, presents: [] },
  },
};
const router = houseRouter(localPorts(house, "ana", { recentLines: 40 }), shown);
await startTerminal(process.stdout, process.stdin, router);
router.stop();
house.close();
