// The ordered list of infrastructure tables; the DDL is generated from it (src/storage/render-ddl.ts).
import { declareStorage } from "./declare.ts";
import { activitiesTable, activityIntentsTable } from "./tables/activities.ts";
import { assetLinksTable, assetStoreTable, assetsTable } from "./tables/assets.ts";
import { actorsTable, environmentsTable, executionInstallationTable, jobsTable } from "./tables/execution.ts";
import { accountsTable, sessionsTable } from "./tables/identity.ts";
import { identitiesTable, installationTable, intentsTable, objectsTable, receiptsTable, runsTable } from "./tables/local.ts";

export const infrastructureTables = declareStorage([
  installationTable, identitiesTable, objectsTable, runsTable, intentsTable, receiptsTable,
  activitiesTable, activityIntentsTable,
  accountsTable, sessionsTable,
  assetStoreTable, assetsTable, assetLinksTable,
  executionInstallationTable, environmentsTable, actorsTable, jobsTable,
]);
