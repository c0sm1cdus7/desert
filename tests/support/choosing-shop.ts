// Choices that cannot be taken are declared before the action runs, including after an earlier answer.
import { object } from "../../src/catalogs/acts.ts";
import { oneOf, option } from "../../src/catalogs/fields.ts";
import { programAct } from "../../src/tools/promises.ts";
import { shopProgram, type Shop } from "./shop.ts";

const input = object({
  context: oneOf("Destino", option("shop", "Local", "l"), option("web", "Web", "w")),
  channel: oneOf("Canal", option("cloud", "Nube", "n"), option("market", "Mercado", "m")),
});
export const choosing = programAct<Shop, typeof input>({
  name: "conectar",
  enter: "conectar",
  key: "c",
  purpose: "un canal de venta",
  undoable: true,
  on: "tool",
  input,
  refuses: ["ya conectado"],
  stops: ({ context, channel }) => (context === "web" && channel === "cloud" ? "ya conectado · Nube" : undefined),
  run: () => ({ status: "accepted", text: "Conectado · Canal", effects: [] }),
  cases: [
    {
      promise: "connects a free channel",
      input: { context: "web", channel: "market" },
      then: { says: "Conectado · Canal", facts: [] },
    },
    {
      promise: "keeps a connected channel disabled",
      input: { context: "web", channel: "cloud" },
      then: { refused: "ya conectado" },
    },
    {
      promise: "uses previous answers",
      input: { context: "shop", channel: "cloud" },
      then: { says: "Conectado · Canal", facts: [] },
    },
  ],
});
export const choosingShop = {
  ...shopProgram,
  registry: shopProgram.registry.map(tool =>
    tool.id === "sales" ? { ...tool, acts: { ...tool.acts, connect: choosing } } : tool,
  ),
};
