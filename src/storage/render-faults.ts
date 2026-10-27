// Test support, generated like every other DDL (plan §15, step 7.6: no hand-written SQL objects): a trigger on a declared
// table that refuses a write with a known message, so an atomicity test can prove a failed acceptance leaves nothing
// behind; and its removal. No installer applies it.
import type { Table } from "./declare.ts";
import { literal, qualified, quoted } from "./render-checks.ts";

export type WriteFault = Readonly<{ name: string; event: "INSERT" | "UPDATE"; message: string;
  /** Refuse only when the new row's column equals this text. */
  when?: Readonly<{ column: string; equals: string }> }>;

const identifier = /^[a-z_][a-z0-9_]{0,62}$/;
function faultFunction(table: Table, fault: Pick<WriteFault, "name">) {
  if (!identifier.test(fault.name)) throw new Error(`STORAGE_DECLARATION: fault ${fault.name} is not a lower-case SQL identifier; contract: src/storage/render-faults.ts`);
  return `${quoted(table.namespace ?? "public")}.${quoted(fault.name)}`;
}

export function renderWriteFault(table: Table, fault: WriteFault): string {
  if (fault.when && !table.columns.some(column => column.name === fault.when?.column)) {
    throw new Error(`STORAGE_DECLARATION: ${table.qualifiedName} has no column ${fault.when.column}; contract: src/storage/render-faults.ts`);
  }
  const raise = `RAISE EXCEPTION ${literal(fault.message)};`;
  const body = fault.when ? `IF NEW.${quoted(fault.when.column)} = ${literal(fault.when.equals)} THEN ${raise} END IF;` : raise;
  return `CREATE FUNCTION ${faultFunction(table, fault)}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${body} RETURN NEW; END $$;
CREATE TRIGGER ${quoted(fault.name)} BEFORE ${fault.event} ON ${qualified(table)} FOR EACH ROW EXECUTE FUNCTION ${faultFunction(table, fault)}();
`;
}

export const renderWriteFaultRemoval = (table: Table, fault: Pick<WriteFault, "name">) =>
  `DROP TRIGGER ${quoted(fault.name)} ON ${qualified(table)}; DROP FUNCTION ${faultFunction(table, fault)}();\n`;
