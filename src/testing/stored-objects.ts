// What a test database holds for a product: every object, read from its generated tables (src/storage/object-store.ts)
// through the same declaration the controller installed, in id order.
import type { Pool } from "pg";
import { loadDefinition } from "../compiled-definition.ts";
import { objectStorage, type ObjectStorage } from "../storage/ddl.ts";
import { readAllObjects, storedObject, type ObjectRecord } from "../storage/object-store.ts";
import { qualified } from "../storage/render-checks.ts";
import { testInstallation } from "./installation.ts";

/** The generated storage of a compiled application in the test installation. */
export const testStorage = (application: object): ObjectStorage => objectStorage(loadDefinition(application), testInstallation);

export const storedObjects = (pool: Pick<Pool, "query">, application: object): Promise<ObjectRecord[]> =>
  readAllObjects(pool, testStorage(application));

/** The quoted, schema-qualified table of one object type, for a test that changes rows behind the controller's back. */
export const storedTable = (application: object, type: string): string => qualified(storedObject(testStorage(application), type).table);
