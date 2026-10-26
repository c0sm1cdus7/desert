// The client installations the repository generates object DDL for: each names its language (owner answer Q20) and the
// products under products/ it installs in its database. Their generated DDL is committed under src/storage/generated/.
// Landmarks is a public catalog served from its source data and has no installation.
import { Notebook } from "../products/notebook/product.ts";
import { clientInstallation } from "../src/storage/client-installation.ts";

/** Notebook's human exposure speaks English (products/notebook/src/exposures.ts), so its reference installation does too. */
export const storedInstallations = [{ installation: clientInstallation({ language: "en" }), products: [Notebook] }] as const;
