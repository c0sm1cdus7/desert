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
import { snapshotPrepareOptions, type PrepareOptions } from "../prepare-options.ts";
import { snapshotPreflightOptions, type PreflightOptions } from "../preflight.ts";
import { preflightMutation } from "./preflight.ts";
import { requireActivityCatalog, type ActivityCatalog } from "../activities/catalog.ts";
import { activityRecord, activitySnapshot } from "../activities/records.ts";
import { answerActivity, cancelActivity, reopenActivity } from "../activities/drafts.ts";
import { createActivity } from "../activities/create.ts";
import { listActivities, snapshotActivityListOptions } from "../activities/discovery.ts";
import type { ActivityListOptions } from "../activities/schema.ts";
import { prepareActivity } from "../activities/prepare.ts";
import { readActivity } from "../activities/read.ts";
import { privateImageSession } from "../assets/session.ts";
import type { PrivateImageHost } from "../assets/host.ts";

export function localSession(database: Database, program: LocalProgram, token: string, surface: string, lifetime: number,
  activities?: ActivityCatalog, images?: PrivateImageHost) {
  database.assertOpen();
  program.application.surface(surface);
  const transact = <T>(operation: (client: PoolClient, actor: string) => Promise<T>, readOnly = false) =>
    database.transaction(async client => {
      await requireInstallation(client, { product: program.application.id, digest: program.application.digest, roles: program.roles }, !readOnly);
      const result = await operation(client, await authenticate(client, token, !readOnly));
      await authenticate(client, token, !readOnly);
      return result;
    }, readOnly);
  const session = Object.freeze({
    ...privateImageSession(transact, program, surface, images),
    activityCreate(occurrence: string, plan: unknown, options: PreflightOptions = {}) {
      const catalog = requireActivityCatalog(activities, program.application), snapshot = jsonSnapshot(plan);
      const metadata = snapshotPreflightOptions(options);
      return transact((client, actor) => createActivity(client, program, catalog, actor, surface, occurrence, snapshot, metadata));
    },
    async activityList(options: ActivityListOptions = {}) {
      const catalog = requireActivityCatalog(activities, program.application);
      const snapshot = snapshotActivityListOptions(options);
      return transact((client, actor) => listActivities(client, program, catalog, actor, surface, snapshot), true);
    },
    activityRead(id: string) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => readActivity(client, program, catalog, actor, surface, id));
    },
    activityAnswer(id: string, revision: number, step: number, input: unknown) {
      const catalog = requireActivityCatalog(activities, program.application), snapshot = jsonSnapshot(input);
      return transact((client, actor) => answerActivity(client, program, catalog, actor, surface, id, revision, step, snapshot));
    },
    activityReopen(id: string, revision: number, step: number) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => reopenActivity(client, program, catalog, actor, surface, id, revision, step));
    },
    activityPrepare(id: string, revision: number) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => prepareActivity(client, program, catalog, actor, surface, id, revision, lifetime));
    },
    activityCancel(id: string, revision: number) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => cancelActivity(client, program, catalog, actor, surface, id, revision));
    },
    async preflight(journeyId: string, input: unknown, options: PreflightOptions = {}) {
      const snapshot = jsonSnapshot(input);
      const metadata = snapshotPreflightOptions(options);
      return transact((client, actor) => preflightMutation(client, program, actor, surface, journeyId, snapshot, metadata), true);
    },
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
    async prepare(runId: string, input: unknown, options?: PrepareOptions) {
      const snapshot = jsonSnapshot(input);
      const base = options === undefined ? undefined : snapshotPrepareOptions(options);
      return transact((client, actor) => prepareMutation(client, program, actor, surface, runId, snapshot, base, images?.store.id));
    },
    accept(intentId: string, confirmationDigest: string) {
      return transact((client, actor) => acceptMutation(client, program, actor, surface, intentId, confirmationDigest, activities, images?.store.id));
    },
    receipt(intentId: string) {
      return transact((client, actor) => recoverReceipt(client, program, actor, surface, intentId));
    },
  });
  rememberSession(session, { application: program.application, surface, roles: program.roles,
    ...(activities ? { activitiesDigest: activities.digest } : {}) });
  return session;
}
export type LocalSession = ReturnType<typeof localSession>;
