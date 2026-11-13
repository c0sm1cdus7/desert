// hcrash's two action cut points, using an invented value and an in-memory test key only.
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { Type } from "@sinclair/typebox";
import { vocabulary } from "../../src/journal/events.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import type { Program } from "../../src/tools/tool-contract.ts";
registerHooks({
  load(url, context, next) {
    if (url.endsWith("/src/programs/house-runtime.ts"))
      return {
        format: "module-typescript",
        shortCircuit: true,
        source: readFileSync(new URL(url), "utf8").replace('"secrets.sqlite"', '"fixture.sqlite"'),
      };
    return next(url, context);
  },
});
const { startHouse, localPorts } = await import("../../src/programs/house-runtime.ts");
const schema = Type.Object({ value: Type.String({ secret: true }) });
const [home, mode] = process.argv.slice(2);
if (!home || !mode) throw new Error("Falta carpeta temporal");
const kill = () => process.kill(process.pid, "SIGKILL");
const options = {
  by: "fixture",
  keys: {
    get: () => Promise.resolve(undefined),
    async set() {},
    async remove() {},
  },
  secretKeys: { key: () => new Uint8Array(32).fill(7) },
  words: vocabulary({}),
  slices: { initial: { vault: 0 }, step: { vault: (state: unknown) => Number(state) + 1 } },
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["vault"] }] },
  registry: [
    {
      id: "vault",
      purpose: "Inventado",
      targets: () => [],
      view: () => "",
      summary: () => "",
      acts: {
        set: toolAct<Program, typeof schema>(schema, () => ({ status: "accepted", text: "Listo" })),
        die: toolAct<Program, typeof schema>(schema, () => {
          kill();
          return { status: "accepted" };
        }),
        slow: toolAct<Program, typeof schema>(
          schema,
          () =>
            new Promise(() => {
              setTimeout(kill, 10);
            }),
        ),
      },
    },
  ],
};
const house = startHouse(home, options, { now: () => 1000, wait: () => () => {} });
const ports = localPorts(house, "ana", { recentLines: 20 });
ports.act({ act: "attend", input: { target: "vault" } }, 0);
ports.act({ act: mode === "reopen" ? "set" : mode, target: "vault", input: { value: "QZ" } }, 0);
if (mode === "reopen") {
  const facts = house.journal.replay<unknown[]>([], (all, event) => [...all, event]);
  house.close();
  process.stdout.write(JSON.stringify(facts));
}
