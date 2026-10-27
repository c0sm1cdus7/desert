// Law: when Postgres refuses a write because it breaks the declaration (src/storage/ddl.ts), the caller sees a named code,
// never a bare database failure: UNIQUE_CONFLICT for a declared unique set, STORAGE_CONSTRAINT for a check, a foreign key,
// a missing value, a declared item limit or a value not of the column's type. The Postgres error, with its constraint
// name, is the cause.
import { DatabaseError } from "pg";

/** The SQLSTATE codes (PostgreSQL Appendix A) a write to the generated tables raises when a value breaks the declaration:
 * class 23 (unique, foreign key, check, not null) and a value that is not of the column's type (22P02 text
 * representation, 22003 numeric range). */
const constraintStates: Readonly<Record<string, "UNIQUE_CONFLICT" | "STORAGE_CONSTRAINT">> = Object.freeze({
  "23505": "UNIQUE_CONFLICT", "23503": "STORAGE_CONSTRAINT", "23514": "STORAGE_CONSTRAINT", "23502": "STORAGE_CONSTRAINT",
  "22P02": "STORAGE_CONSTRAINT", "22003": "STORAGE_CONSTRAINT",
});

/** The named error for a declaration violation; any other failure unchanged. */
export function namedViolation(error: unknown): unknown {
  const code = error instanceof DatabaseError && error.code !== undefined ? constraintStates[error.code] : undefined;
  return code === undefined ? error : new Error(code, { cause: error });
}

/** Runs a write and names the declaration violation Postgres raises, if any. */
export async function namingViolations<T>(write: () => Promise<T>): Promise<T> {
  try { return await write(); } catch (error) { throw namedViolation(error); }
}
