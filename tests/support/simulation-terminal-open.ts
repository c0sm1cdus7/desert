// Runs the real simulation form with synthetic nested secrets and records only public evidence.
import { Type } from "@sinclair/typebox";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { programAct } from "../../src/tools/promises.ts";
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import { houseRouter } from "../../src/surface/bridge/assembly/house-router.ts";
import { localPorts } from "../../src/runtime/house-runtime.ts";
import { simulationHouse, publicLimit } from "./simulation-house.ts";
import { shopShown } from "./shop.ts";
const home = process.argv[2];
if (!home) throw new Error("Missing test directory");
const shape = (kind: string, title: string, key: string) =>
  Type.Object({
    kind: Type.Literal(kind, { title, key }),
    amount: Type.Number({ title: "Importe", mask: "number", minimum: 0, maximum: 10000 }),
    nested: Type.Object({
      token: Type.String({ title: "Dato sintético", secret: true, minLength: 1, maxLength: 200 }),
    }),
  });
const input = Type.Union([shape("first", "Primero", "p"), shape("second", "Segundo", "s")], { title: "Caso" });
let executed = 0;
const action = programAct({
  name: "probar",
  enter: "probar",
  purpose: "probar datos inventados",
  key: "p",
  on: "tool",
  undoable: true,
  input,
  run: () => {
    executed++;
    return { status: "accepted" };
  },
  cases: [
    {
      promise: "Probe",
      input: { kind: "first", amount: 1, nested: { token: "synthetic" } },
      then: { says: "", facts: [] },
    },
  ],
});
const f = simulationHouse(home, action);
await f.attend();
await f.call("save", publicLimit);
const router = houseRouter(localPorts(f.house(), "ana", { recentLines: 20 }), {
  locale: shopShown.locale,
  words: { probe: { name: "Prueba", key: "p", itself: [] } },
});
await startTerminal(process.stdout, process.stdin, router);
router.stop();
f.reopen();
writeFileSync(join(home, "result.json"), JSON.stringify({ events: f.events(), executed }));
f.close();
