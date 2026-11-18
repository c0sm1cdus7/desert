// Abre la terminal real sobre la casa sintética de autores y permite reabrir su diario.
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import { localPorts } from "../../src/runtime/house-runtime.ts";
import { houseRouter } from "../../src/surface/bridge/assembly/house-router.ts";
import { authorHouse, authorShown } from "./author-house.ts";
const home = process.argv[2];
const author = process.argv[3];
if (!home || !author) throw new Error("Missing author fixture arguments");
const house = authorHouse(home, author);
const router = houseRouter(
  localPorts(house, "ana", { recentLines: 40 }),
  authorShown(author, process.argv[4] === "thread"),
);
await startTerminal(process.stdout, process.stdin, router);
router.stop();
house.close();
