// The products under products/ that install a Postgres store; each has its generated object DDL committed under
// src/storage/generated/. Landmarks is a public catalog served from its source data and has no installation.
import { Notebook } from "../products/notebook/product.ts";

export const storedProducts = [Notebook] as const;
