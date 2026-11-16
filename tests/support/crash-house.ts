// IPC carries the ordinary socket frames so crash/SQLite boundaries can be checked without a Unix listener.
import { duplexPair } from "node:stream";
import { startHouse } from "../../src/programs/house-runtime.ts";
import { houseDoor } from "../../src/doors/socket/house-door.ts";
import { MemoryHouseKeys } from "../../src/adapters/secrets/custody/house-keys.ts";
import { shopProgram } from "./shop.ts";
const [home, mode] = process.argv.slice(2);
if (!home) throw new Error("Missing home");
const house = startHouse(home, {
  ...shopProgram,
  by: "house",
  secretKeys: new MemoryHouseKeys(),
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] },
});
const door = houseDoor(house, new Map([["ana-terminal", { identity: "ana", door: "terminal" }]]));
const pair = duplexPair();
door.accept(pair[1]);
const kill = () => process.kill(process.pid, "SIGKILL");
house.bus.on(event => {
  if (mode === "recorded" && event.kind === "act" && event.data.option === "register") kill();
  if (mode === "before" && event.kind === "act-started" && event.data.option === "register") kill();
  if (
    mode === "result" &&
    event.kind === "act-result" &&
    event.data.status === "accepted" &&
    house.tools.state().tools.sales.has("one")
  )
    kill();
  if (mode === "during" && event.kind === "sale-registered") kill();
});
pair[0].on("data", (bytes: Buffer) => {
  if (mode === "after" && bytes[4] === 0) {
    const message: unknown = JSON.parse(bytes.subarray(5).toString());
    if (
      message &&
      typeof message === "object" &&
      "tipo" in message &&
      message.tipo === "resultado" &&
      "id" in message &&
      message.id === "lost"
    ) {
      kill();
      return;
    }
  }
  process.send?.({ frame: bytes.toString("base64") });
});
process.on("message", (message: unknown) => {
  if (message && typeof message === "object" && "frame" in message && typeof message.frame === "string")
    pair[0].write(Buffer.from(message.frame, "base64"));
});
process.on("disconnect", () => {
  void door.close();
  pair[0].destroy();
  pair[1].destroy();
});
process.send?.({ ready: true });
