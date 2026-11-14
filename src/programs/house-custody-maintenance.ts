import { existsSync } from "node:fs";
import { join } from "node:path";
import type { HouseOptions } from "./house-runtime.ts";
import type { Program } from "../tools/tool-contract.ts";
import { houseJournal } from "../adapters/storage/house-journal.ts";
import { credentialJournal } from "../adapters/declared/credential-journal.ts";
import { maintainCustody } from "../adapters/secrets/custody/open-secret-vault.ts";
import { CustodyError } from "../adapters/secrets/custody/house-keys.ts";
import type { CustodyMaintenance } from "../adapters/secrets/custody/custody-maintenance.ts";
export type { CustodyMaintenance } from "../adapters/secrets/custody/custody-maintenance.ts";
type Result = ReturnType<typeof maintainCustody>;
export function maintainHouseCustody<X extends Program>(
  home: string,
  options: HouseOptions<X>,
  request: Exclude<CustodyMaintenance, { operation: "forget" }>,
): Exclude<Result, { forgotten: true }>;
export function maintainHouseCustody<X extends Program>(
  home: string,
  options: HouseOptions<X>,
  request: Extract<CustodyMaintenance, { operation: "forget" }>,
): Extract<Result, { forgotten: true }>;
/** No tools, adapters, projections, boot or timers run in maintenance. The journal enforces a closed house. */
export function maintainHouseCustody<X extends Program>(
  home: string,
  options: HouseOptions<X>,
  request: CustodyMaintenance,
): Result {
  if (!options.secretKeys) throw new CustodyError("E-CUSTODY-PROVIDER");
  if (!existsSync(join(home, "journal.sqlite"))) throw new CustodyError("E-CUSTODY-MISSING");
  const journal = houseJournal(join(home, "journal.sqlite"), options.words, undefined, "preserve");
  try {
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
      entry => journal.append(entry, Date.now()),
      () => journal.check(),
    );
    // Each custody addition is one durable engine transaction; its anchor runs only after commit.
    credentials.publish(entry => credentials.transaction(() => journal.batch(() => journal.append(entry, Date.now()))));
    return maintainCustody(join(home, "secrets.sqlite"), home, options.secretKeys, credentials.ledger, request);
  } finally {
    journal.close();
  }
}
