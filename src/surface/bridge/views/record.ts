// The record of a thing: everything that was done to it, as the journal has it, read as its last list.
import { programCall } from "../../../fields/program-call.ts";
import { genericTexts as generic } from "../../../texts/generic-surface.texts.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Tool } from "../../contract/shown-tool.ts";
import type { SurfacePorts } from "../ports/house-ports.ts";
import { firstLine } from "./notices.ts";
/** An instant as the journal keeps it, for a program that does not say how its country writes one. */
const plainMoment = (at: number): string => new Date(at).toISOString().slice(0, 16).replace("T", " ");
/** After what its tool declared, a thing reads everything that was done to it, and the act that made it when it
 * was the act of another thing: newest first, with who did it and when. What was said in several lines is told by
 * its first. A thing nothing was done to (it is there by itself) has no such list. */
export const recordOf =
  <X extends Program>(ports: SurfacePorts<X>, moment: (at: number) => string = plainMoment) =>
  (target: string): ReturnType<Tool["view"]> => {
    const done = ports
      .state()
      .entries.filter(({ data }) => (data.target === target || data.made?.includes(target)) && data.draft !== true);
    const rows = done.toReversed().map(entry => ({
      title: firstLine(entry.data.text),
      detail: `${entry.data.author} · ${programCall(moment, entry.at)}`,
      still: true,
    }));
    return rows.length ? [{ ...generic.record, reads: true as const, rows }] : [];
  };
