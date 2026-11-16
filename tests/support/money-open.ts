// Local terminal fixture: no persisted credentials, external service or model calls.
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import { houseRouter } from "../../src/surface/bridge/assembly/house-router.ts";
import { shopRig } from "./shop-rig.ts";
import { shopShown } from "./shop.ts";
import { moneyRegistry } from "./money-program.ts";
const rig = shopRig({ registry: moneyRegistry });
const router = houseRouter(
  rig.ports("ana", () => 17),
  shopShown,
);
await startTerminal(process.stdout, process.stdin, router);
router.stop();
rig.close();
