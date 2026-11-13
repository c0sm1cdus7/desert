import { journalTexts } from "../../texts/journal.texts.ts";
// Readable previous folds are required evidence, even when their format or calculation identity is obsolete.
import type { DatabaseSync } from "node:sqlite";
import { readableFold } from "../../journal/snapshot-format.ts";
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
export function previousFolds(db: DatabaseSync, runner: string): boolean {
  const last = db.prepare(journalTexts.lastSequenceSql).get();
  const folds = new Map<string, { seq: number; state: unknown }>();
  for (const row of db.prepare(journalTexts.previousFoldsSql).all()) {
    if (typeof row.name !== "string") return false;
    const value = readableFold(row.state, Number(last?.seq));
    if (!value) return false;
    folds.set(row.name, value);
  }
  return [...folds].some(([name, clock]) => {
    if (!name.startsWith("clock@") || !(clock.state instanceof Map)) return false;
    const tools = folds.get(`tools:${runner}@${name.slice("clock@".length)}`);
    return (
      tools?.seq === clock.seq &&
      record(tools.state) &&
      tools.state.through === tools.seq &&
      record(tools.state.house) &&
      record(tools.state.tools)
    );
  });
}
