// Inspection owns a disposable journal copy, never a live house or a secret store.
import { ok } from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { copyKeptJournal } from "../../storage/copy-kept-journal.ts";
import { houseJournal } from "../../runtime/house-journal.ts";
import { journalKept } from "../../storage/journal-store.ts";
import { checkReopenedState } from "../calculations/reopened-state.ts";
import { Redactor } from "../../keychain/redact.ts";
import { InspectionUnavailable } from "../../tools/failures/inspection-unavailable.ts";
import { credentialJournal } from "../../adapters/credential-journal.ts";
import { Bus } from "../../journal/bus.ts";
import { effect } from "../../house/facts.ts";
import { guardJournal } from "../../house/members.ts";
import { coreRegistry } from "../../tools/identities/identities.ts";
import { startTools } from "../../tools/start.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { RunningHouse } from "../../runtime/house-runtime.ts";
import type { HouseOptions } from "../../house/state.ts";
import { houseProjections } from "../../runtime/house-projections.ts";
import { inspectionCapabilities } from "./kept-capabilities.ts";
import { promiseTexts as said } from "../../texts/promises.texts.ts";
type InspectionProgram<X extends Program> = Omit<HouseOptions<X>, "by" | "creation">;
const denied = (): never => {
  throw new InspectionUnavailable(said.inspectionWrite);
};
const inspectionDevices = {
  register: denied,
  accept: denied,
  retire: denied,
  authentication: denied,
  connect: denied,
  door: { challenge: denied, connect: denied },
  available: denied,
  close: denied,
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
    history: journal.replay<ReturnType<typeof journal.append>[]>([], (events, event) => [...events, event]),
    bus,
    secrets,
    state,
    now: () => now,
    capabilities: inspectionCapabilities(program, facts),
  });
  return { bus, tools };
}
function prepareCopy<X extends Program>(given: InspectionProgram<X>, file: string) {
  const { runner, last } = journalKept(file);
  ok(runner, said.keptEmpty);
  // Composed as a live house composes it: the core pieces it asked for, and the guard on every new identity name.
  const program = {
    ...given,
    registry: coreRegistry(given.registry, runner, given.identities, given.mentes?.asistentes, given.mentes?.programas),
  };
  checkReopenedState<X>(file, { ...program, by: runner });
  return { program, runner, last };
}
type Visit<X extends Program, R> = (house: RunningHouse<X>, now: number) => R | Promise<R>;
async function inspectPrepared<X extends Program, R>(
  { program, runner, last }: ReturnType<typeof prepareCopy<X>>,
  file: string,
  use: Visit<X, R>,
): Promise<R> {
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
      const quiet = { storageNotices: () => [], storageUnsaved: () => [] };
      return await use(
        { ...house, ...quiet, devices: inspectionDevices, now: () => now, cancelInheritedWake: denied },
        now,
      );
    } finally {
      close();
    }
  } finally {
    journal.close();
  }
}
/** Each branch owns a fresh file; only the verified, closed seed is shared. */
async function copied<R>(file: string, use: (copy: string) => Promise<R>): Promise<R> {
  const home = mkdtempSync(join(tmpdir(), "desert-inspection-"));
  try {
    const copy = join(home, "journal.sqlite");
    copyKeptJournal(file, copy);
    return await use(copy);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}
/** No runtime switch: the only input is evidence, copied before opening. No key provider or adapter is opened. */
export function inspectKept<X extends Program, R>(program: InspectionProgram<X>, file: string, use: Visit<X, R>) {
  return copied(file, copy => inspectPrepared(prepareCopy(program, copy), copy, use));
}
/** Validate one immutable baseline, then replay each path on a separate byte-for-byte copy of that baseline. */
export function inspectKeptPaths<X extends Program, R>(
  program: InspectionProgram<X>,
  file: string,
  use: (open: <V>(visit: Visit<X, V>) => Promise<V>) => Promise<R>,
): Promise<R> {
  return copied(file, async seed => {
    const prepared = prepareCopy(program, seed);
    const open = <V>(visit: Visit<X, V>) => copied(seed, copy => inspectPrepared(prepared, copy, visit));
    return use(open);
  });
}
