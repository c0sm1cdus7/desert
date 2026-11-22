// Keeps thread cuts as public references and restores them without copying the journal's text.
import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { requireMind } from "../../fields/mind-errors.ts";
import {
  threadKey,
  threadStep,
  type MindThread,
  type ThreadCompaction,
  type ThreadEntry,
  type ThreadKey,
} from "./mind-threads.ts";
const cut = Type.Object(
  {
    through: Type.Integer({ minimum: 0 }),
    keep: Type.Array(Type.String(), { uniqueItems: true }),
    omitted: Type.Array(Type.String(), { uniqueItems: true }),
  },
  { additionalProperties: false },
);
const saved = Type.Object(
  {
    version: Type.Literal(1),
    threads: Type.Array(
      Type.Object(
        {
          key: Type.String(),
          cuts: Type.Array(cut),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
export function openMindThreads(home: string) {
  const file = join(home, "mind-threads.json");
  const cuts = new Map<string, readonly ThreadCompaction[]>();
  restoreCuts(file, cuts);
  const read = (key: ThreadKey, entries: readonly ThreadEntry[]): MindThread => {
    const compacted = cuts.get(threadKey(key)) ?? [];
    const omitted = new Set<string>();
    for (const cut of compacted) {
      requireMind(
        [...cut.keep, ...cut.omitted].every(id => entries.some(entry => entry.id === id && entry.seq <= cut.through)),
        "thread.reference",
      );
      requireMind(
        cut.keep.every(id => !cut.omitted.includes(id)),
        "thread.overlap",
      );
      cut.omitted.forEach(id => omitted.add(id));
    }
    return { entries: entries.filter(entry => !omitted.has(entry.id)), compacted };
  };
  return {
    read,
    compact: (
      key: ThreadKey,
      entries: readonly ThreadEntry[],
      request: Readonly<{ through: number; keep: readonly string[] }>,
    ) => {
      const next = threadStep(read(key, entries), request);
      const updated = new Map(cuts).set(threadKey(key), next.compacted);
      const data = { version: 1, threads: [...updated].map(([key, cuts]) => ({ key, cuts })) };
      writeFileSync(`${file}.pending`, JSON.stringify(data), { mode: 0o600 });
      renameSync(`${file}.pending`, file);
      cuts.set(threadKey(key), next.compacted);
      return next;
    },
  };
}

function restoreCuts(file: string, cuts: Map<string, readonly ThreadCompaction[]>) {
  if (existsSync(file)) {
    const value: unknown = JSON.parse(readFileSync(file, "utf8"));
    requireMind(Value.Check(saved, value), "thread.store");
    for (const entry of value.threads) {
      requireMind(!cuts.has(entry.key), "thread.duplicate");
      cuts.set(entry.key, entry.cuts);
    }
  }
}
