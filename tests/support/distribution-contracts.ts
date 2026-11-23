// Composes contract programs and certifies their cases in an isolated house before the test houses open.
import { Value } from "@sinclair/typebox/value";
import { Bus } from "../../src/journal/bus.ts";
import { vocabulary, type Event } from "../../src/journal/vocabulary.ts";
import { createHouse } from "../../src/house/members.ts";
import { effect } from "../../src/house/facts.ts";
import { selectionKit, selectionKitSchema, type Selection } from "../../src/house/kit-selection.ts";
import { startState, toolsStep } from "../../src/house/state.ts";
import { SqliteJournal } from "../../src/storage/journal-store.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import { input } from "./contract-packages.ts";
import type { ActResult, Program, ToolRegistry } from "../../src/tools/tool-contract.ts";
import type { Composition } from "../../src/tools/promises-contract.ts";
import { contractHistory } from "../../src/runtime/contracts/contract-history.ts";
import { runContractCases } from "../../src/runtime/contracts/contract-gate.ts";
import { compose, type DistributionOf } from "../../src/runtime/distributions/compose.ts";
import { contractPrograms, contractPackages } from "./contract-programs.ts";
import { presentation } from "./installable-program.ts";
export { input, rejection, receipt, sales, documents, required } from "./contract-packages.ts";
export type Demo = DistributionOf<typeof contractPrograms>;
const build = { core: "fixture-core", executor: "fixture-executor" };
// The gate needs to run the adapter before there is evidence to compose.
const installed = contractPrograms.map(program => ({ id: program.id, ...program.install() }));
const candidate: Composition<Program> = {
  identities: true,
  projectionVersion: "fixture-contract-candidate",
  words: vocabulary({ "documents/issued": contractPrograms[1].facts[0].schema }),
  registry: installed.map(program => program.tool),
  slices: {
    initial: { documents: contractPrograms[1].initial(), sales: contractPrograms[0].initial() },
    step: Object.fromEntries(installed.map(program => [program.id, program.step])),
  },
};
export function openHouse<X extends Program>(
  program: Pick<Composition<X>, "words" | "slices"> & { registry: ToolRegistry<X> },
  path = ":memory:",
  selections?: readonly Selection[],
) {
  const { words, slices, registry } = program;
  const journal = new SqliteJournal(path, words);
  const bus = new Bus<X["fact"]>(
    entry => journal.append(entry, 1),
    work => journal.batch(work),
  );
  const initial = startState<X>(slices, "demo");
  const state = journal.watch("contracts", initial, (before, event) => toolsStep(before, event, slices));
  journal.restore();
  const events = () => journal.replay<Event<X["fact"]>[]>([], (all, event) => [...all, event]);
  const history = contractHistory(initial, slices, events);
  if (!events().length) {
    createHouse(bus, {
      admin: "ana",
      language: "es",
      assignments: ["ana", "beto"].map(identity => ({
        identity,
        tools: registry.map(tool => tool.id),
        language: "es",
      })),
    });
    if (selections) bus.emit(effect("kit-set", { version: 2, holder: "beto", kit: selectionKit(selections) }, "ana"));
  }
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
export function contractSelections(preparation: unknown): readonly Selection[] {
  if (!Value.Check(selectionKitSchema, preparation)) throw new Error("Invalid contract fixture preparation");
  return preparation.selections;
}
export const contractCertification = await runContractCases({
  programs: contractPackages,
  provider: "documents",
  consumer: "sales",
  contract: "fiscal-documents",
  build,
  prepare: preparation => openHouse(candidate, ":memory:", contractSelections(preparation)),
});
export const contractOptions = {
  programs: contractPrograms,
  identities: true,
  minds: { assistants: false, programs: [] },
  shown: presentation,
  contracts: { build, ...contractCertification },
} as const;
export function contractHouse(
  override?: () => ActResult<Demo> | Promise<ActResult<Demo>>,
  path = ":memory:",
  selections?: readonly Selection[],
) {
  const { program } = compose(contractOptions);
  const registry = program.registry.map(tool => {
    const action = tool.acts["fiscal/issue"];
    return override && tool.id === "documents" && action
      ? {
          ...tool,
          acts: {
            ...tool.acts,
            "fiscal/issue": {
              ...toolAct<Demo, ReturnType<typeof input>>(input(), override),
              folder: "documents/fiscal",
              on: "thing" as const,
            },
          },
        }
      : tool;
  });
  return openHouse({ ...program, registry }, path, selections);
}
