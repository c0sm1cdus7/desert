// The client installations the repository generates object DDL for: each names its language (owner answer Q20) and the
// products under products/ it installs in its database. Their generated DDL and storage models are committed under
// src/storage/generated/, their migrations under src/storage/migrations/. Landmarks is a public catalog served from its
// source data and has no installation.
//
// `decisions` (by product id) holds the explicit decision blocks the NEXT `node scripts/storage.ts plan` needs for a change
// that could lose or reject stored data (src/storage/migration-decisions.ts), e.g.
//   notebook: [{ object: "note", drop: { field: "body", approvedBy: "franco" } }]
// The plan records them in the migration it generates; once committed, they are removed here (--check fails
// MIGRATION_DECISION_UNUSED while a decision has nothing left to decide).
import { Notebook } from "../products/notebook/product.ts";
import { clientInstallation } from "../src/storage/client-installation.ts";
import type { MigrationDecision } from "../src/storage/migration-decisions.ts";

type Decisions = Readonly<Record<string, readonly MigrationDecision[]>>;
const notebookDecisions: Decisions = {};

/** Notebook's human exposure speaks English (products/notebook/src/exposures.ts), so its reference installation does too. */
export const storedInstallations = [
  { installation: clientInstallation({ language: "en" }), products: [Notebook], decisions: notebookDecisions },
] as const;
