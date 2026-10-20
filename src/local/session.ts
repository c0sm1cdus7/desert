import type { PoolClient } from "pg";
import { jsonSnapshot } from "../json.ts";
import { authenticate } from "./identity.ts";
import { beginJourney, readJourney } from "./admission.ts";
import { prepareMutation } from "./prepare.ts";
import { acceptMutation, recoverReceipt } from "./accept.ts";
import type { Database } from "./database.ts";
import type { LocalProgram } from "./program.ts";
import { requireInstallation } from "./installation.ts";
import { watchLocalAvailability, type LocalAvailabilityOptions } from "./availability.ts";
import { inspectOffer } from "./offer.ts";
import { rememberSession } from "./session-binding.ts";

export function localSession(database: Database, program: LocalProgram, token: string, surface: string, lifetime: number) {
  database.assertOpen();
  program.application.surface(surface);
  const transact = <T>(operation: (client: PoolClient, actor: string) => Promise<T>) =>
    database.transaction(async client => {
      await requireInstallation(client, { product: program.application.id, digest: program.application.digest, role: program.role });
      const result = await operation(client, await authenticate(client, token));
      await authenticate(client, token);
      return result;
    });
  const session = Object.freeze({
    offer(journeyId: string, subject: string) {
      return transact((client, actor) => inspectOffer(client, program, actor, surface, journeyId, subject));
    },
    watchAvailability(options?: LocalAvailabilityOptions) {
      return watchLocalAvailability(database, program, token, surface, options);
    },
    begin(journeyId: string, subject?: string) {
      return transact((client, actor) => beginJourney(client, program, actor, surface, journeyId, subject, lifetime));
    },
    read(runId: string) {
      return transact((client, actor) => readJourney(client, program, actor, surface, runId));
    },
    async prepare(runId: string, input: unknown) {
      const snapshot = jsonSnapshot(input);
      return transact((client, actor) => prepareMutation(client, program, actor, surface, runId, snapshot));
    },
    accept(intentId: string, confirmationDigest: string) {
      return transact((client, actor) => acceptMutation(client, program, actor, surface, intentId, confirmationDigest));
    },
    receipt(intentId: string) {
      return transact((client, actor) => recoverReceipt(client, program, actor, surface, intentId));
    },
  });
  rememberSession(session, { application: program.application, surface, role: program.role });
  return session;
}
export type LocalSession = ReturnType<typeof localSession>;
