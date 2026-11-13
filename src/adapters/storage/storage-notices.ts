// During startup warnings reach stderr; once restored, the house keeps them with its ordinary diagnostics.
import type { FoldWarning } from "../../journal/snapshot-format.ts";
import { effect, type HouseEmission } from "../../journal/events.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
export const snapshotWarning = ({ name, reason }: FoldWarning): void =>
  process.emitWarning(journalTexts.rebuildNotice(name, reason), {
    code: journalTexts.rebuildCode,
    type: "StorageNotice",
  });
export function storageNotices(by: string) {
  const pending: FoldWarning[] = [];
  let keep: ((warning: FoldWarning) => void) | undefined;
  return {
    warn: (warning: FoldWarning) => {
      snapshotWarning(warning);
      if (keep) keep(warning);
      else pending.push(warning);
    },
    attach: (write: (entry: HouseEmission<"tool-entry">) => void) => {
      keep = ({ name, reason }) =>
        write(
          effect(
            "tool-entry",
            {
              tool: "program",
              target: "program",
              author: by,
              text: journalTexts.rebuilt,
              silent: true,
              diagnostic: `${journalTexts.rebuildCode} · ${journalTexts.rebuildNotice(name, reason)}`,
            },
            by,
          ),
        );
      pending.splice(0).forEach(keep);
    },
  };
}
