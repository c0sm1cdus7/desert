// The public result of a program action: its words and destination, without technical diagnostics.
import type { Decision } from "../../tools/execute.ts";
import { portReason } from "../../tools/failures/port-failure.ts";
import type { Emission } from "../../journal/events.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import type { Result } from "../shown-tool.ts";
import { attendAndAct, type SurfacePorts } from "./house-ports.ts";
/** What the tool wrote about the act it just ran, when it wrote something. */
const wroteBy = (effects: readonly Emission[]): string | undefined => {
  for (const effect of effects) if (effect.layer === "house" && effect.kind === "tool-entry") return effect.data.text;
  return undefined;
};
/** The thing an act made: what it was done to in the end, when that is not where it was started. */
function madeBy(effects: Parameters<typeof wroteBy>[0], target: string): string | undefined {
  for (const effect of effects)
    if (effect.layer === "house" && effect.kind === "act-done" && effect.data.object !== target)
      return effect.data.object;
  return undefined;
}
export async function programResult<X extends Program>(
  ports: SurfacePorts<X>,
  target: string,
  name: string,
  input: unknown,
): Promise<Result> {
  const done = await attendAndAct(ports, target, name, input).catch((error: unknown): Decision<X> => ({
    status: "rejected" as const,
    reason: portReason(error),
    effects: [],
  }));
  if (done.status !== "accepted") return { ok: false, reason: done.reason ?? "" };
  const text = wroteBy(done.effects) ?? said.ok;
  const made = madeBy(done.effects, target);
  const told = done.private ? `${text} · ${ports.receipt?.(done.private) ?? done.private}` : text;
  return { ok: true, text: told, ...(made === undefined ? {} : { made }) };
}
