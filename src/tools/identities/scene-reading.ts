// Full scene blocks use ordinary read-only rows; their width also fits the smallest supported terminal.
import { width } from "../../fields/column-width.ts";
import type { Tool, ViewRow } from "../../surface/contract/shown-tool.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
const columns = 36;
function lines(text: string): string[] {
  return text.split("\n").flatMap(paragraph => {
    const result: string[] = [];
    let line = "";
    for (const word of paragraph.split(/(\s+)/u)) {
      if (width(line + word) > columns && line) {
        result.push(line);
        line = "";
      }
      for (const char of word) {
        if (width(line + char) > columns) {
          result.push(line);
          line = "";
        }
        line += char;
      }
    }
    return [...result, line];
  });
}
export function sceneReading(stacks: ReturnType<Tool["view"]>): ReturnType<Tool["view"]> {
  return stacks.map(stack =>
    stack.title !== words.sceneTitle
      ? stack
      : {
          ...stack,
          rows: stack.rows.flatMap((row): ViewRow[] => [
            { title: row.title, still: true, spans: [{ text: row.title, tone: "t2" }] },
            ...lines(row.detail ?? "").map(text => ({
              title: text,
              still: true,
              spans: [{ text, tone: "t1" as const }],
            })),
          ]),
        },
  );
}
