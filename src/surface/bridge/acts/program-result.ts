// The public result of a program action: its words and destination, without technical diagnostics.
import type { ExecutionDestination } from "../../../fields/device-protocol.ts";
import type { Decision } from "../../../tools/execute.ts";
import type { Emission } from "../../../journal/vocabulary.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Text } from "../../../fields/phrases.ts";
import { surfaceTexts } from "../../../texts/surface.texts.ts";
import type { Result } from "../../contract/shown-tool.ts";
import { attendAndAct, say, type SurfacePorts } from "../ports/house-ports.ts";
/** What the tool wrote about the act it just ran, when it wrote something. */
const wroteBy = (effects: readonly Emission[]): Text | undefined => {
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
  destination?: ExecutionDestination,
): Promise<Result> {
  const done = await attendAndAct(ports, target, name, input, destination).catch((error: unknown): Decision<X> => ({
    status: "rejected" as const,
    reason: ports.defect(error, target, target, name),
    effects: [],
  }));
  if (done.status !== "accepted") return { ok: false, reason: say(ports, done.reason ?? "") };
  const text = say(ports, wroteBy(done.effects) ?? surfaceTexts.ok);
  const made = madeBy(done.effects, target);
  const receipt = done.private === undefined ? undefined : say(ports, done.private);
  const told = receipt ? `${text} · ${ports.receipt?.(receipt) ?? receipt}` : text;
  const textWithReason = done.reason ? `${told} · ${say(ports, done.reason)}` : told;
  return { ok: true, text: textWithReason, ...(made === undefined ? {} : { made }) };
}
