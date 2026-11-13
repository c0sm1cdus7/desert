// Old journals are inspected read-only before a lock, vault, snapshot or boot can be written.
import { secretTexts } from "../../../texts/secrets/secrets.texts.ts";
import { journalReader } from "../../storage/journal-store.ts";
import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { privateFileMode } from "../../../catalogs/levers.ts";
import { declaredInput } from "../positions/declared-input.ts";

import type { HouseOptions } from "../../../programs/house-runtime.ts";
import { startState, toolsStep } from "../../../tools/tools.ts";
import type { Program, State } from "../../../tools/tool-contract.ts";
import { isReference, record, secretPositions, storedSchema } from "../positions/secret-positions.ts";
import { protectedVocabulary } from "../positions/protected-vocabulary.ts";
type Finding = Readonly<{ action: string; position: string; seq: number }>;
type Review = { version: number; reviewed: number; unreviewable: number };
export class SecretHistoryError extends Error {
  readonly code = "E-SECRET-HISTORY";
  readonly positions: readonly Finding[];
  constructor(positions: readonly Finding[]) {
    super(secretTexts.history(positions.map(p => `${p.action} ${p.position} (#${p.seq})`).join(", ")));
    this.positions = positions;
  }
}
const parse = (value: unknown): unknown => (typeof value === "string" ? JSON.parse(value) : undefined);
const protectedAlready = (file: string): boolean => {
  if (!existsSync(file)) return false;
  const mark = parse(readFileSync(file, "utf8"));
  return (
    record(mark) && mark.version === 1 && typeof mark.reviewed === "number" && typeof mark.unreviewable === "number"
  );
};
function inspectAct<X extends Program>(
  row: Record<string, unknown>,
  state: State<X>,
  options: HouseOptions<X>,
  result: Review,
  positions: Finding[],
): void {
  const data = row.data;
  if (row.kind !== "act" || !record(data)) return;
  const input = declaredInput(options, state, row);
  if (input) result.reviewed++;
  else result.unreviewable++;
  secretPositions(input && storedSchema(input), data.input, (value, position) => {
    if (!isReference(value))
      positions.push({ action: `${String(data.object)}/${String(data.option)}`, position, seq: Number(row.seq) });
    return value;
  });
}
function review<X extends Program>(file: string, options: HouseOptions<X>): Review {
  const result = { version: 1, reviewed: 0, unreviewable: 0 };
  if (!existsSync(file)) return result;
  const reader = journalReader(file, protectedVocabulary(options.words));
  const positions: Finding[] = [];
  let state = startState(options.slices, options.by);
  try {
    for (const row of reader.since(0)) {
      inspectAct(row, state, options, result, positions);
      if (!positions.length) state = toolsStep(state, row, options.slices);
    }
    if (positions.length) throw new SecretHistoryError(positions);
    return result;
  } finally {
    reader.close();
  }
}
export function protectHistory<X extends Program>(home: string, options: HouseOptions<X>): () => void {
  const mark = join(home, "secret-protection.json");
  if (protectedAlready(mark)) return () => {};
  const result = review(join(home, "journal.sqlite"), options);
  return () => {
    const pending = `${mark}.pending`;
    writeFileSync(pending, `${JSON.stringify(result)}\n`, { mode: privateFileMode });
    renameSync(pending, mark);
  };
}
