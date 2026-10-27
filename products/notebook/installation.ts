// Notebook's reference client installation (owner answers Q4/Q20): its human exposure speaks English
// (products/notebook/src/exposures.ts), so its stored text orders in English. The local hosts and the committed DDL
// (scripts/storage-products.ts) read this one declaration.
import { clientInstallation } from "../../src/storage/client-installation.ts";

export const NotebookInstallation = clientInstallation({ language: "en" });
