// Two independent program artifacts and their deterministic in-memory house.
import { Type } from "@sinclair/typebox";
import { Bus } from "../../src/journal/bus.ts";
import { vocabulary, type ProgramFacts, type Event } from "../../src/journal/vocabulary.ts";
import { createHouse } from "../../src/house/members.ts";
import { startState, toolsStep } from "../../src/house/state.ts";
import { SqliteJournal } from "../../src/storage/journal-store.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import type { Slices, ToolRegistry, ActResult } from "../../src/tools/tool-contract.ts";
import { contractHistory } from "../../src/runtime/contracts/contract-history.ts";

import { input } from "./contract-packages.ts";
export { input, rejection, receipt, sales, documents, required } from "./contract-packages.ts";
const catalog = { "documentos/emitido": Type.Object({ venta: Type.String(), comprobante: Type.String() }) };
type Fact = ProgramFacts<typeof catalog>;
export type Demo = { fact: Fact; tools: { "documentos/fiscal": ReadonlyMap<string, unknown> } };
const words = vocabulary(catalog);
const slices: Slices<Demo> = {
  initial: { "documentos/fiscal": new Map() },
  step: {
    "documentos/fiscal": (state, event) =>
      event.kind === "documentos/emitido"
        ? new Map([...state, [event.data.comprobante, { numero: "1", estado: "emitido", privado: "oculto" }]])
        : state,
  },
};
const emitAction = (override?: () => ActResult<Demo> | Promise<ActResult<Demo>>) =>
  toolAct<Demo, ReturnType<typeof input>>(input(), (value, context) => {
    if (override) return override();
    if (value.venta === "invalid") return { status: "rejected", reason: "invalida", value: { codigo: "invalida" } };
    return {
      status: "accepted",
      value: { id: value.venta, numero: "1" },
      effects: context.state.tools["documentos/fiscal"].has(value.venta)
        ? []
        : [words.fact("documentos/emitido", { venta: value.venta, comprobante: value.venta }, context.by)],
    };
  });
function demoRegistry(override?: () => ActResult<Demo> | Promise<ActResult<Demo>>): ToolRegistry<Demo> {
  return [
    {
      id: "documentos/fiscal",
      purpose: "Documentos",
      facts: ["documentos/emitido"],
      targets: () => [],
      view: () => "",
      summary: () => "",
      acts: {
        emitir: emitAction(override),
      },
    },
    {
      id: "ventas/facturacion",
      purpose: "Ventas",
      targets: () => [],
      view: () => "",
      summary: () => "",
      acts: {
        facturar: toolAct<Demo, ReturnType<typeof input>>(input(), async (value, context) => {
          const port = context.contracts?.["documentos-fiscales"];
          const result = await port?.actions.emitir?.(value);
          return { status: "accepted", value: result };
        }),
      },
    },
  ];
}
export function contractHouse(override?: () => ActResult<Demo> | Promise<ActResult<Demo>>, path = ":memory:") {
  const journal = new SqliteJournal(path, words);
  const bus = new Bus<Fact>(
    entry => journal.append(entry, 1),
    work => journal.batch(work),
  );
  const initial = startState<Demo>(slices, "demo");
  const state = journal.watch("contracts", initial, (before, event) => toolsStep(before, event, slices));
  journal.restore();
  const events = () => journal.replay<Event<Fact>[]>([], (all, event) => [...all, event]);
  const history = contractHistory(initial, slices, events);
  const registry = demoRegistry(override);
  if (!events().length)
    createHouse(bus, {
      admin: "ana",
      assignments: ["ana", "beto"].map(identity => ({
        identity,
        tools: registry.map(tool => tool.id),
      })),
    });
  const ports = { bus, registry, state, now: () => 1, secrets: { capture: () => {}, scrub: <T>(value: T) => value } };
  return {
    ports,
    history,
    events,
    close: () => {
      bus.close();
      journal.close();
    },
  };
}
