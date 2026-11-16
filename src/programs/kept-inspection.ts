// Inspection owns a disposable journal copy, never a live house or a secret store.
import { ok } from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { copyKeptJournal } from "../adapters/storage/copy-kept-journal.ts";
import { houseJournal } from "../adapters/storage/house-journal.ts";
import { journalKept } from "../adapters/storage/journal-store.ts";
import { checkReopenedState } from "../adapters/storage/reopened-state.ts";
import { Redactor } from "../adapters/secrets/redact.ts";
import { InspectionUnavailable } from "../tools/failures/inspection-unavailable.ts";
import { credentialJournal } from "../adapters/declared/credential-journal.ts";
import { Bus } from "../journal/bus.ts";
import { effect } from "../journal/events.ts";
import { guardJournal } from "../house/house.ts";
import { coreRegistry } from "../tools/core/identities/identities.ts";
import { startTools } from "../tools/tools.ts";
import type { Program } from "../tools/tool-contract.ts";
import type { RunningHouse, HouseOptions } from "./house-runtime.ts";
import { houseProjections } from "./house-projections.ts";
import { inspectionCapabilities } from "./kept-capabilities.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
type InspectionProgram<X extends Program> = Omit<HouseOptions<X>, "by" | "creation">;
const denied = (): never => {
  throw new InspectionUnavailable(said.inspectionWrite);
};
function inspectionTools<X extends Program>(
  program: InspectionProgram<X>,
  journal: ReturnType<typeof houseJournal<X["fact"]>>,
  runner: string,
  now: number,
) {
  const secrets = new Redactor<X>(program.words.event, denied);
  const credentials = credentialJournal(
    () => journal.replay<ReturnType<typeof journal.append>[]>([], (all, event) => [...all, event]),
    denied,
  );
  // Shapes are checked; authentication against the original ledger key is deliberately absent.
  const facts = credentials.ledger.facts();
  const { state } = houseProjections(journal, { ...program, by: runner });
  const bus = new Bus<X["fact"]>(
    entry =>
      journal.append(
        credentials.write(entry, value => secrets.write(value)),
        now,
      ),
    write => journal.batch(write),
  );
  const tools = startTools<X>({
    ...program,
    bus,
    secrets,
    state,
    now: () => now,
    capabilities: inspectionCapabilities(program, facts),
  });
  return { bus, tools };
}
async function inspectCopy<X extends Program, R>(
  given: InspectionProgram<X>,
  file: string,
  use: (house: RunningHouse<X>, now: number) => R | Promise<R>,
): Promise<R> {
  const { runner, last } = journalKept(file);
  ok(runner, said.keptEmpty);
  // Composed as a live house composes it: the core pieces it asked for, and the guard on every new identity name.
  const program = { ...given, registry: coreRegistry(given.registry, runner, given.identities) };
  checkReopenedState<X>(file, { ...program, by: runner });
  const journal = houseJournal(file, program.words),
    now = last + 1;
  guardJournal(journal, runner);
  try {
    const { bus, tools } = inspectionTools(program, journal, runner, now);
    const close = () => {
      try {
        tools.stop();
      } finally {
        bus.close();
      }
    };
    try {
      bus.emit(effect("boot", {}, runner));
      // The copy's folder stands for home; cancelling an inherited wake would write, so it is denied like any write.
      const house = { home: dirname(file), bus, journal, tools, registry: program.registry, close };
      return await use({ ...house, storageNotices: () => [], now: () => now, cancelInheritedWake: denied }, now);
    } finally {
      close();
    }
  } finally {
    journal.close();
  }
}
/** No runtime switch: the only input is evidence, copied before opening. No key provider or adapter is opened. */
export async function inspectKept<X extends Program, R>(
  program: InspectionProgram<X>,
  file: string,
  use: (house: RunningHouse<X>, now: number) => R | Promise<R>,
): Promise<R> {
  const home = mkdtempSync(join(tmpdir(), "desert-inspection-"));
  try {
    const copy = join(home, "journal.sqlite");
    copyKeptJournal(file, copy);
    return await inspectCopy(program, copy, use);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}
