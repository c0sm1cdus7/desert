// The ordered list of infrastructure tables; the DDL is generated from it (src/storage/render-ddl.ts). Each installer
// applies its own group (plan §15, step 7.6): a client's controller database (src/local/database.ts) holds the controller
// ledger, the identities and the private asset rows its objects' asset columns reference; the host's execution queue
// (src/execution/queue.ts) holds its own schema.
import { declareStorage } from "./declare.ts";
import { activitiesTable, activityIntentsTable } from "./tables/activities.ts";
import { assetStoreTable, assetsTable } from "./tables/assets.ts";
import { actorsTable, environmentsTable, executionInstallationTable, jobsTable } from "./tables/execution.ts";
import { accountsTable, sessionsTable } from "./tables/identity.ts";
import { identitiesTable, installationTable, intentsTable, receiptsTable, runsTable } from "./tables/local.ts";

export const controllerTables = declareStorage([
  installationTable, identitiesTable, runsTable, intentsTable, receiptsTable,
  activitiesTable, activityIntentsTable,
  accountsTable, sessionsTable,
  assetStoreTable, assetsTable,
]);
export const executionTables = declareStorage([executionInstallationTable, environmentsTable, actorsTable, jobsTable]);
export const infrastructureTables = declareStorage([...controllerTables, ...executionTables]);
