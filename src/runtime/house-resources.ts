import { CustodyError } from "../keychain/custody/house-keys.ts";
import { closeResources } from "../tools/boundaries/close-resources.ts";
import { defectReporter } from "../tools/failures/defect-reporter.ts";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { protectedHouse } from "../keychain/positions/protected-house.ts";
import { declaredAdapters } from "../adapters/compose-adapters.ts";
import { credentialJournal } from "../adapters/credential-journal.ts";
import { openSecretVault } from "../keychain/custody/open-secret-vault.ts";
import { houseJournal } from "./house-journal.ts";
import { houseProjections } from "./house-projections.ts";
import type { SqliteJournal } from "../storage/journal-store.ts";
import { storageNotices } from "../storage/storage-notices.ts";
import { privateDirectoryMode } from "../storage/home.ts";
import { Bus } from "../journal/bus.ts";
import type { Emission } from "../journal/facts.ts";
import type { TimeSource } from "../journal/clock.ts";
import { holds } from "../house/kit.ts";
import { checkIdentity, guardJournal } from "../house/members.ts";
import type { SecretVault } from "../keychain/secret-vault.ts";
import type { Program, State } from "../tools/tool-contract.ts";
import type { HouseOptions } from "../house/state.ts";
/** The bus of a running house: every fact is written to its journal as `kept` leaves it. What one act writes goes
 * whole or not at all, and all of it happens at one instant: the one at which it began to be written. */
function busOf<X extends Program>(
  journal: SqliteJournal<X["fact"]>,
  time: TimeSource,
  kept: (emission: Emission<X["fact"]>) => Emission<X["fact"]>,
  transaction: <T>(work: () => T) => T,
) {
  let together: number | undefined;
  return new Bus<X["fact"]>(
    emission => {
      journal.check();
      return journal.append(kept(emission), together ?? time.now());
    },
    write =>
      transaction(() =>
        journal.batch(() => {
          const outer = together;
          together = outer ?? time.now();
          try {
            return write();
          } finally {
            together = outer;
          }
        }),
      ),
  );
}
function publicCapabilities<X extends Program>(
  secrets: SecretVault<X>,
  compose: ReturnType<typeof declaredAdapters>,
  state: () => State<X>,
  registry: HouseOptions<X>["registry"],
) {
  return typeof secrets.capabilities === "function"
    ? {
        capabilities: secrets.capabilities(custody =>
          compose(custody, scope => holds(registry, state().house, scope.actor, scope.tool)),
        ),
      }
    : {};
}
function houseAdapters<X extends Program>(options: HouseOptions<X>) {
  const compose = declaredAdapters(
    options,
    options.registry.map(tool => tool.id),
  );
  const captures = Object.values(options.adapters ?? {}).some(adapter =>
    Object.values(adapter.methods).some(method => method.permissions.capture),
  );
  const binds = Object.values(options.credentialSlots ?? {}).some(slots => slots.length > 0);
  if (!options.secretKeys && (captures || binds)) throw new CustodyError("E-CUSTODY-PROVIDER");
  return compose;
}
function houseCustody<X extends Program>(
  home: string,
  options: HouseOptions<X>,
  journal: SqliteJournal<X["fact"]>,
  time: TimeSource,
) {
  const { words, secretKeys } = options;
  const credentials = credentialJournal(
    (after = 0) =>
      journal.replay<ReturnType<typeof journal.append>[]>(
        [],
        (all, event) => {
          all.push(event);
          return all;
        },
        after,
      ),
    entry => journal.append(entry, time.now()),
    () => journal.check(),
  );
  const secrets = openSecretVault<X>(
    join(home, "secrets.sqlite"),
    words.event,
    secretKeys,
    () => journal.close(),
    credentials.ledger,
  );
  return { credentials, secrets };
}
function restoredCustody<X extends Program>(
  home: string,
  options: HouseOptions<X>,
  journal: SqliteJournal<X["fact"]>,
  time: TimeSource,
) {
  try {
    return { ...houseProjections(journal, options), ...houseCustody(home, options, journal, time) };
  } catch (error) {
    journal.close();
    throw error;
  }
}
export function houseResources<X extends Program>(home: string, options: HouseOptions<X>, time: TimeSource) {
  const { by, registry } = options;
  const compose = houseAdapters(options);
  const protection = protectedHouse(home, options);
  mkdirSync(home, { recursive: true, mode: privateDirectoryMode });
  const notices = storageNotices();
  const journal = houseJournal(join(home, "journal.sqlite"), options.words, notices.warn);
  guardJournal(journal, by);
  const { credentials, secrets, state, clock } = restoredCustody(home, options, journal, time);
  const bus = busOf<X>(
    journal,
    time,
    emission => credentials.write(checkIdentity(emission, by), value => secrets.write(value)),
    credentials.transaction,
  );
  credentials.publish(entry => bus.emit(entry));
  const stops: (() => void)[] = [];
  const report = defectReporter(
    registry,
    by,
    entry => journal.append(entry, time.now()),
    value => secrets.scrub(value),
  );
  const close = closing(stops, [bus, journal, secrets], report);
  return {
    capabilities: (state: () => State<X>) => publicCapabilities(secrets, compose, state, options.registry),
    protection,
    state,
    clock,
    journal,
    secrets,
    bus,
    stops,
    report,
    close,
    notices,
  };
}
function closing(
  stops: (() => void)[],
  resources: readonly { close(): void }[],
  report: ReturnType<typeof defectReporter>,
) {
  return () =>
    closeResources([...stops.splice(0), ...resources.map(resource => () => resource.close())], error => {
      report(error, "program", "program", "stop");
    });
}
