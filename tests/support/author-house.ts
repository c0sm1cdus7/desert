// A synthetic house with historical authorship, without sockets or providers.
import { startHouse } from "../../src/runtime/house-runtime.ts";
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
import { effect } from "../../src/house/facts.ts";
import { identitiesProgram, identitiesShown } from "./identities-program.ts";
import type { Shown } from "../../src/surface/bridge/ports/house-ports.ts";
import { anyToolScreen } from "../../src/surface/bridge/views/any-tool.ts";
import type { Shop } from "./shop.ts";
export function authorHouse(home: string, author: string) {
  const house = startHouse(home, {
    ...identitiesProgram,
    registry: identitiesProgram.registry.map(tool => (tool.id === "sales" ? { ...tool, name: "Ventas" } : tool)),
    by: "house",
    secretKeys: new MemoryHouseKeys(),
    creation: {
      admin: "ana",
      language: "es",
      assignments: ["lucia", "unnamed", "retired"].map(identity => ({
        identity,
        tools: ["sales"],
        language: "es",
      })),
    },
  });
  if (!house.tools.state().tools.sales.has("s1")) {
    house.bus.emit(effect("named", { identity: "lucia", name: "Lucía" }, "ana"));
    house.bus.emit(effect("named", { identity: "retired", name: "Inés" }, "ana"));
    house.bus.emit(effect("assistant-enabled", { owner: "lucia", name: "Nora" }, "ana"));
    const by = author.startsWith("mind:") || author.startsWith("assistant:") ? "lucia" : author;
    house.tools.act({ act: "attend", input: { target: "sales" } }, 0, by);
    const result = house.tools.act({ act: "register", target: "sales", input: { sale: "s1", total: 100 } }, 0, by);
    if (result.status !== "accepted") throw new Error(JSON.stringify(result));
    house.bus.emit(
      effect("tool-entry", { tool: "sales", target: "sales/s1", text: "Escrita · prueba", author }, author),
    );
    house.bus.emit(effect("removed", { identity: "retired" }, "ana"));
    house.bus.emit(effect("assistant-disabled", { owner: "lucia" }, "ana"));
  }
  return house;
}
export const authorShown = (author: string, thread: boolean): Shown<Shop> =>
  thread
    ? {
        ...identitiesShown,
        screens: {
          sales: (...args) => ({
            ...anyToolScreen(...args),
            conversation: {
              said: () => [
                {
                  id: "first",
                  who: [
                    { text: author, tone: "t1", bold: true },
                    { text: " · 10:00", tone: "t3" },
                  ],
                  text: "Mensaje original",
                },
                { id: "second", who: [{ text: author, tone: "t1", bold: true }], text: "Respuesta" },
              ],
              live: () => null,
              send: () => Promise.resolve(undefined),
              open: () => ({ title: "Adjunto", lines: [] }),
            },
          }),
        },
      }
    : identitiesShown;
