// A read-only WAL connection can create SQLite sidecars; journal and vault bytes stay intact on refusal.
import { protectedAlready } from "./protection-mark.ts";
import { secretTexts } from "../../../texts/secrets/secrets.texts.ts";
import { journalReader } from "../../storage/journal-store.ts";
import { existsSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { privateFileMode } from "../../../catalogs/levers.ts";
import { declaredInput } from "../positions/declared-input.ts";

import type { HouseOptions } from "../../../programs/house-runtime.ts";
import { startState, toolsStep } from "../../../tools/tools.ts";
import type { Program, State } from "../../../tools/tool-contract.ts";
import { isReference, record, secretPositions, storedSchema } from "../positions/secret-positions.ts";
import { inspectionVocabulary } from "./inspection-vocabulary.ts";
type Finding = Readonly<{ action: string; position: string; seq: number }>;
type Review = { version: number; reviewed: number; reviewedFacts: number; unreviewable: number };
export class SecretHistoryError extends Error {
  readonly code = "E-SECRET-HISTORY";
  readonly positions: readonly Finding[];
  constructor(positions: readonly Finding[]) {
    super(secretTexts.history(positions.map(p => `${p.action} ${p.position} (#${p.seq})`).join(", ")));
    this.positions = positions;
  }
}
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
  const result = { version: 2, reviewed: 0, reviewedFacts: 0, unreviewable: 0 };
  if (!existsSync(file)) return result;
  const words = inspectionVocabulary(options.words);
  const reader = journalReader(file, words);
  const positions: Finding[] = [];
  let state = startState(options.slices, options.by);
  const schema = words.event;
  try {
    for (const row of reader.since(0)) {
      inspectAct(row, state, options, result, positions);
      if (row.layer === "program") {
        result.reviewedFacts++;
        secretPositions(schema, row, (value, position) => {
          if (!isReference(value)) positions.push({ action: row.kind, position, seq: row.seq });
          return value;
        });
      }
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
