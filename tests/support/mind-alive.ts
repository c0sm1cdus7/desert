// A real Node process must survive an unobserved invalid act promise.
import { shopRig } from "./shop-rig.ts";
import { shopRegistry } from "./shop.ts";
import { effect } from "../../src/journal/events.ts";
import type { ToolStartup } from "../../src/tools/startup-contract.ts";
import type { Shop } from "./shop.ts";
const cyclic: Record<string, unknown> = {};
cyclic.self = cyclic;
const rig = shopRig({
  registry: [
    ...shopRegistry,
    {
      id: "desk",
      purpose: "Prueba",
      targets: () => [],
      summary: () => "",
      view: () => "",
      acts: {},
      start: (ports: ToolStartup<Shop>) =>
        ports.bus.on("woke", () => {
          void ports.act({ act: "write", target: "desk", input: cyclic });
          void ports.act({ act: "write", target: "desk", input: { number: 1n } });
          void ports.act(
            Object.defineProperty({}, "act", {
              enumerable: true,
              get: () => {
                throw new Error("getter");
              },
            }),
          );
        }),
    },
  ],
});
rig.bus.emit(effect("woke", { id: "desk:zero" }, "shop"));
setTimeout(() => {
  rig.close();
  console.log("SIGUE VIVA");
}, 30);
