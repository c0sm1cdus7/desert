// Persiste identidad aleatoria, cifrados y hechos; borra con diario truncado y eliminación segura.
import { secretRef, factFrom } from "./custody-rows.ts";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { privateDatabase } from "../../storage/home.ts";
import { sqliteFiles } from "../../storage/sqlite-files.ts";
import { CustodyError } from "./house-keys.ts";
import type { CredentialFact, CredentialLedger, CustodyRow, SecretRef } from "./custody-contract.ts";
export { secretRef, factSchema } from "./custody-rows.ts";
function write<T>(work: () => T): T {
  try {
    return work();
  } catch (error) {
    if (error instanceof Error && "errcode" in error) throw new CustodyError("E-CUSTODY-STORAGE");
    throw error;
  }
}
export class CustodyDatabase implements CredentialLedger {
  readonly db: DatabaseSync;
  constructor(file: string) {
    this.db = privateDatabase(file);
    try {
      this.db.exec(
        `pragma journal_mode=TRUNCATE; pragma journal_size_limit=0;
         pragma locking_mode=EXCLUSIVE; begin exclusive; commit;`,
      );
    } catch {
      this.db.close();
      throw new CustodyError("E-CUSTODY-LOCKED");
    }
    try {
      this.db.exec(`pragma secure_delete=ON; pragma synchronous=FULL;
      create table if not exists custody_material (
        ref text primary key, payload text, owner text, retained integer not null);
      create table if not exists custody_facts (seq integer primary key, body text not null);
      create table if not exists custody_meta (name text primary key, value text not null);
      create table if not exists custody_holds (ref text, purpose text, primary key(ref, purpose));
      create trigger if not exists custody_no_update before update on custody_facts
        begin select raise(abort, 'append-only'); end;
      create trigger if not exists custody_no_delete before delete on custody_facts
        begin select raise(abort, 'append-only'); end;`);
    } catch {
      this.db.close();
      throw new CustodyError("E-CUSTODY-STORAGE");
    }
  }
  rows(): CustodyRow[] {
    return this.db
      .prepare("select * from custody_material")
      .all()
      .map(row => {
        if (
          !secretRef(row.ref) ||
          (row.payload !== null && typeof row.payload !== "string") ||
          (row.owner !== null && typeof row.owner !== "string")
        )
          throw new CustodyError("E-CUSTODY-STORAGE");
        return { ref: row.ref, payload: row.payload, owner: row.owner, retained: row.retained === 1 };
      });
  }
  row(ref: SecretRef): CustodyRow | undefined {
    const row = this.db.prepare("select * from custody_material where ref=?").get(ref);
    if (!row) return undefined;
    if (row.payload !== null && typeof row.payload !== "string") throw new CustodyError("E-CUSTODY-STORAGE");
    return {
      ref,
      payload: row.payload,
      owner: typeof row.owner === "string" ? row.owner : null,
      retained: row.retained === 1,
    };
  }
  identity(): string {
    const row = this.db.prepare("select value from custody_meta where name='house-id'").get();
    if (typeof row?.value === "string" && /^[0-9a-f-]{36}$/u.test(row.value)) return row.value;
    if (row || this.keyCheck() || this.rows().some(row => row.payload !== null) || this.facts().length)
      throw new CustodyError("E-CUSTODY-INTEGRITY");
    const id = randomUUID();
    write(() => this.db.prepare("insert into custody_meta values ('house-id', ?)").run(id));
    return id;
  }
  keyCheck(): string | undefined {
    const row = this.db.prepare("select value from custody_meta where name='key-check'").get();
    return typeof row?.value === "string" ? row.value : undefined;
  }
  saveKeyCheck(value: string): void {
    write(() => this.db.prepare("insert into custody_meta values ('key-check', ?)").run(value));
  }
  hold(ref: SecretRef, purpose: string): void {
    write(() => this.db.prepare("insert or ignore into custody_holds values (?, ?)").run(ref, purpose));
  }
  unhold(ref: SecretRef, purpose: string): void {
    write(() => this.db.prepare("delete from custody_holds where ref=? and purpose=?").run(ref, purpose));
  }
  held(ref: SecretRef): boolean {
    return !!this.db.prepare("select ref from custody_holds where ref=?").get(ref);
  }
  intent(ref: SecretRef, owner: string | null, retained: boolean): void {
    write(() =>
      this.db.prepare("insert into custody_material values (?, null, ?, ?)").run(ref, owner, Number(retained)),
    );
  }
  put(ref: SecretRef, payload: string): void {
    write(() => this.db.prepare("update custody_material set payload=? where ref=?").run(payload, ref));
  }
  unretain(ref: SecretRef): void {
    write(() => this.db.prepare("update custody_material set retained=0, owner=null where ref=?").run(ref));
  }
  remove(ref: SecretRef): void {
    write(() => this.db.prepare("delete from custody_material where ref=?").run(ref));
  }
  append(fact: CredentialFact): void {
    write(() => this.db.prepare("insert into custody_facts (body) values (?)").run(JSON.stringify(fact)));
  }
  appendBatch(facts: readonly CredentialFact[]): void {
    write(() => this.db.exec("begin immediate"));
    try {
      facts.forEach(fact => this.append(fact));
      write(() => this.db.exec("commit"));
    } catch (error) {
      this.db.exec("rollback");
      throw error;
    }
  }
  facts(): readonly CredentialFact[] {
    return this.factsAfter(0);
  }
  factsAfter(count: number): readonly CredentialFact[] {
    return this.db
      .prepare("select body from custody_facts where seq > ? order by seq")
      .all(count)
      .map(row => factFrom(row.body));
  }
  close(): void {
    if (this.db.isOpen) this.db.close();
  }
  retireLegacy(): void {
    write(() => this.db.exec("delete from secrets;"));
  }
  compactLegacy(): void {
    write(() =>
      this.db.exec("pragma wal_checkpoint(TRUNCATE); vacuum; pragma wal_checkpoint(TRUNCATE); drop table secrets;"),
    );
  }
}

/** Reject a populated legacy vault without a provider before taking a writable SQLite connection. */
export function custodyPreflight(file: string, provider: boolean): void {
  if (file === ":memory:" || !existsSync(file)) return;
  /** Like every storage file of the base, links in the vault or its siblings are refused before SQLite opens it. */
  sqliteFiles(file);
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const tables = new Set(
      db
        .prepare("select name from sqlite_master where type='table'")
        .all()
        .map(r => r.name),
    );
    if (!provider && tables.has("secrets") && db.prepare("select 1 from secrets limit 1").get())
      throw new CustodyError("E-CUSTODY-PROVIDER");
    if (tables.has("custody_meta")) {
      const check = db.prepare("select value from custody_meta where name='key-check'").get()?.value;
      if (typeof check === "string" && check !== "custody-v2") throw new CustodyError("E-CUSTODY-FORMAT");
    }
  } catch (error) {
    if (error instanceof CustodyError) throw error;
    throw new CustodyError(
      error instanceof Error && error.message.includes("locked") ? "E-CUSTODY-LOCKED" : "E-CUSTODY-STORAGE",
    );
  } finally {
    db.close();
  }
}
