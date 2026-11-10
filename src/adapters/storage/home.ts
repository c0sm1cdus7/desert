// What a house keeps on disk stays private to whoever runs it.
import { chmodSync, closeSync, openSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { privateFileMode } from "../../catalogs/levers.ts";
export function privateDatabase(file: string): DatabaseSync {
  if (file !== ":memory:") {
    closeSync(openSync(file, "a", privateFileMode));
    chmodSync(file, privateFileMode);
  }
  return new DatabaseSync(file);
}
