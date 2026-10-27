// The client installations the repository generates object DDL for: each names its language (owner answer Q20) and the
// products under products/ it installs in its database. Their generated DDL is committed under src/storage/generated/.
// Landmarks is a public catalog served from its source data and has no installation.
import { NotebookInstallation } from "../products/notebook/installation.ts";
import { Notebook } from "../products/notebook/product.ts";

export const storedInstallations = [{ installation: NotebookInstallation, products: [Notebook] }] as const;
