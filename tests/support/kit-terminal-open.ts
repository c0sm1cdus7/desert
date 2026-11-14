// Test-only probes use files in the test home; every kit edit goes through the real terminal.
import { readFileSync, writeFileSync, renameSync, watchFile, unwatchFile } from "node:fs";
import { join } from "node:path";
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import { MemoryHouseKeys } from "../../src/adapters/secrets/custody/house-keys.ts";
import { localPorts, startHouse } from "../../src/programs/house-runtime.ts";
import { houseRouter } from "../../src/surface/bridge/house-router.ts";
import { paint } from "../../src/doors/terminal/paint.ts";
import { textOf } from "../../src/doors/terminal/cells.ts";
import { keysOf } from "../../src/doors/terminal/input.ts";
import { kitProgram, kitShown } from "./kit-program.ts";
const home = process.argv[2];
if (!home) throw new Error("A test home is required");
const house = startHouse(home, {
  ...kitProgram,
  by: "house",
  secretKeys: new MemoryHouseKeys(),
  creation: { admin: "ana", assignments: [{ identity: "beto", tools: [] }] },
});
const router = houseRouter(localPorts(house, process.argv[3] ?? "ana", { recentLines: 40 }), kitShown);
const observerPorts = localPorts(house, "beto", { recentLines: 40 });
const observer = houseRouter(
  {
    ...observerPorts,
    act: (value, through) => {
      const result = observerPorts.act(value, through);
      if (value.act === "wait") remember(result);
      return result;
    },
  },
  kitShown,
);
keysOf("v").forEach(key => observer.send(key));
const list = houseRouter(localPorts(house, "beto", { recentLines: 40 }), kitShown);
keysOf("i").forEach(key => list.send(key));
const screen = (view: typeof router) => textOf(paint(view.screen({ rows: 36 }), { cols: 106, rows: 36 })).join("\n");
const write = (name: string, value: unknown) => {
  writeFileSync(join(home, `${name}.tmp`), JSON.stringify(value));
  renameSync(join(home, `${name}.tmp`), join(home, name));
};
const publish = () => write("observed.json", { tools: screen(observer), identities: screen(list) });
function remember(result: ReturnType<typeof house.tools.act>) {
  write("started.json", result);
  void (result.status === "processing" ? result.completion : Promise.resolve(result)).then(done => {
    write("result.json", done);
    publish();
  });
}
const stop = house.bus.on(publish);
const stopObserver = observer.watch(publish);
const request = join(home, "probe.json");
writeFileSync(request, "{}");
watchFile(request, { interval: 20 }, () => {
  const command: unknown = JSON.parse(readFileSync(request, "utf8"));
  if (!command || typeof command !== "object") return;
  const by: unknown = Reflect.get(command, "by"),
    act: unknown = Reflect.get(command, "act");
  if (typeof by !== "string" || typeof act !== "string") return;
  if (Reflect.get(command, "surface") === true) {
    keysOf("e\r").forEach(key => observer.send(key));
    publish();
    return;
  }
  if (observer.screen({ rows: 36 }).body.kind === "thread") observer.send({ kind: "cancel" });
  house.tools.act({ act: "attend", input: { target: "sales" } }, 0, by);
  const input: unknown = Reflect.get(command, "input");
  const result = house.tools.act({ act, target: "sales", input }, house.tools.state().through, by);
  remember(result);
});
publish();
await startTerminal(process.stdout, process.stdin, router);
unwatchFile(request);
stop();
stopObserver();
observer.stop();
list.stop();
router.stop();
house.close();
