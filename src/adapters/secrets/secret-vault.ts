// Schema-marked values live in a separate local store; persisted facts carry opaque references.
import type { TSchema } from "@sinclair/typebox";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { ids } from "../../catalogs/ids.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { privateDatabase } from "../storage/home.ts";
import { capturable, Redactor } from "./redact.ts";
export class SecretVault<X extends Program> extends Redactor<X> {
  private readonly db: DatabaseSync;
  constructor(file: string, journal: TSchema) {
    const values = new Map<string, string>();
    super(journal, values, value => {
      const id = `${ids.secret}${randomUUID()}`;
      this.db.prepare("insert into secrets values (?, ?)").run(id, value);
      return id;
    });
    this.db = privateDatabase(file);
    this.db.exec("create table if not exists secrets (id text primary key, value text not null unique)");
    for (const row of this.db.prepare("select id, value from secrets").all())
      if (capturable(row.value) && typeof row.id === "string") values.set(row.value, row.id);
  }
  close(): void {
    if (this.db.isOpen) this.db.close();
  }
}
