// Opens the words fixture without sockets, providers or persistent keys.
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
import { startHouse, localPorts } from "../../src/runtime/house-runtime.ts";
import { houseRouter } from "../../src/surface/bridge/assembly/house-router.ts";
import { programKit } from "../../src/house/kit-selection.ts";
import { effect } from "../../src/house/facts.ts";
import { wordsDistribution } from "./words-distribution.ts";
const home = process.argv[2];
if (!home) throw new Error("A synthetic home is required");
const { program, shown } = wordsDistribution;
const house = startHouse(home, {
  ...program,
  by: "house",
  secretKeys: new MemoryHouseKeys(),
  creation: {
    admin: "ana",
    language: "es",
    assignments: [{ identity: "ana", tools: ["notes", "conversation"], language: "es" }],
  },
});
if (process.argv[3] === "news") {
  house.bus.emit(effect("granted", { version: 2, identity: "lucia", kit: programKit(["notes"]) }, "ana"));
  house.tools.act({ act: "attend", input: { target: "notes/personal" } }, 0, "lucia");
  const result = house.tools.act({ act: "personal/add", target: "notes/personal", input: {} }, 0, "lucia");
  if (result.status !== "accepted") throw new Error(JSON.stringify(result));
  house.bus.emit(
    effect(
      "tool-entry",
      {
        tool: "notes",
        target: "notes/personal/same",
        author: "lucia",
        text: "Nota de Lucía",
        detail: "Nueva nota",
      },
      "lucia",
    ),
  );
}
const router = houseRouter(localPorts(house, "ana", { recentLines: 40 }), shown);
await startTerminal(process.stdout, process.stdin, router);
router.stop();
house.close();
