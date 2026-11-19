// Replay one path on a disposable journal copy, using the same transitions and action bridge as the router.
import { inspectionUnavailable } from "../../tools/failures/inspection-unavailable.ts";
import { ok } from "node:assert/strict";
import type { Intent } from "../../surface/contract/contract.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import type { Shown } from "../../surface/bridge/ports/house-ports.ts";
import { choices, cursorOf, stacksOf } from "../../surface/menus/lists.ts";
import { resolve } from "../../surface/router/resolve.ts";
import { actOf, fieldOf, optionsOf, start, type Session, type Running } from "../../surface/session/screen.ts";
import { finished, step } from "../../surface/router/step.ts";
import type { Tool } from "../../surface/contract/shown-tool.ts";
import { walkBody, walkHints } from "../../surface/acts/walk.ts";
import { promiseTexts as said } from "../../texts/promises.texts.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import { outsideCause } from "../../tools/outside.ts";
import { isProgram } from "../../tools/execution/program-causes.ts";
import type { Program, ToolRegistry } from "../../tools/tool-contract.ts";
import { errorIn } from "../read-screen.ts";
import { quietScreen } from "../promises/answers/promised-entry.ts";
import { localPorts, type RunningHouse } from "../../runtime/house-runtime.ts";
export type Path = readonly Intent[];
export type InspectionCut = Readonly<{ tool: string; action: string; reason: string }>;
export type KeptPath = Readonly<{ fingerprint: string; branches: readonly Path[]; unavailable?: InspectionCut }>;
const moveTo = (from: number, to: number): Intent[] =>
  Array.from({ length: Math.abs(to - from) }, (): Intent => ({ kind: to < from ? "up" : "down" }));
/** Only offered input is taken: no invented text, no secrets, no calls made outside the action bridge. */
function offered(session: Session, tools: readonly Tool[]): readonly Path[] {
  const place = session.at(-1);
  if (!place || place.kind === "talk") return [];
  if (place.kind !== "act")
    return choices(place, tools).map((row, at) =>
      row.key ? [{ kind: "type", text: row.key }] : [...moveTo(cursorOf(place, tools), at), { kind: "confirm" }],
    );
  if (place.phase !== "asking") return [[{ kind: "cancel" }]];
  const field = fieldOf(tools, place);
  const enter = walkHints(place, field, tools).some(hint => hint.intent === "confirm");
  if (!field || field.kind === "secret") return [];
  if (field.kind === "text") return enter ? [[{ kind: "confirm" }]] : [];
  const options = field.kind === "pick" ? field.found("") : optionsOf(field);
  const branches = options.flatMap((row, at): Path[] => {
    if (row.off || row.title === surfaceTexts.back) return [];
    const key: Intent = field.kind === "many" ? { kind: "type", text: " " } : { kind: "confirm" };
    const enabled = options.flatMap((option, index) => (option.off ? [] : [index]));
    return [[...moveTo(enabled.indexOf(place.at), enabled.indexOf(at)), key]];
  });
  return field.kind === "many" && enter ? [[{ kind: "confirm" }], ...branches] : branches;
}
function inspect(session: Session, tools: readonly Tool[], now: number): void {
  const place = session.at(-1);
  const bar = { state: "connected", clock: "00:00", now } as const;
  quietScreen(resolve(session, tools, bar, { rows: 10000 }));
  if (!place || place.kind === "talk") return;
  const field = place.kind === "act" && place.phase === "asking" ? fieldOf(tools, place) : null;
  const body = place.kind === "act" ? walkBody(place, field, now) : undefined;
  const asked = body?.kind === "thread" ? (body.options ?? []) : [];
  const rows = place.kind === "act" ? asked : stacksOf(place, tools).flatMap(stack => stack.rows);
  for (const row of rows) ok(!row.off || row.detail?.trim(), said.disabledReason);
}
function outsideResult<X extends Program>(
  program: Readonly<{ registry: ToolRegistry<X> }>,
  tools: readonly Tool[],
  session: Session,
  walk: Running,
  reason: string,
  now: number,
): void {
  const act = program.registry.find(tool => tool.id === walk.tool)?.acts[walk.act];
  ok(act && isProgram(act) && outsideCause(act.outside, reason), said.offeredFailed(reason));
  const failed = finished(session, walk, { ok: false, reason });
  const bar = { state: "connected", clock: "00:00", now } as const;
  const body = resolve(failed, tools, bar, { rows: 10000 }).body;
  ok(errorIn(body, reason));
}
async function runOffered(tools: readonly Tool[], run: Running) {
  try {
    return await actOf(tools, run).run(run.answers);
  } catch (error) {
    const unavailable = inspectionUnavailable(error);
    if (!unavailable) throw error;
    return { unavailable: { tool: run.tool, action: run.act, reason: unavailable.reason } };
  }
}
/** A fingerprint includes the program state, not the journal sequence or random ids of navigation events. */
const fingerprint = (session: Session, state: unknown): string =>
  JSON.stringify([session, state], (_key, value: unknown) => (value instanceof Map ? [...value] : value));
export async function keptPath<X extends Program>(
  program: Readonly<{ registry: ToolRegistry<X> }>,
  shown: Shown<X>,
  house: RunningHouse<X>,
  now: number,
  path: Path,
): Promise<KeptPath> {
  const tools = houseTools(
    localPorts(house, house.tools.state().house.admin, { recentLines: 100 }, () => now),
    shown,
  );
  let session = start;
  inspect(session, tools, now);
  for (const intent of path) {
    const stepped = step(session, intent, tools, now);
    session = stepped.session;
    if (stepped.run) {
      const result = await runOffered(tools, stepped.run);
      if ("unavailable" in result)
        return { fingerprint: fingerprint(session, house.tools.state().tools), branches: [], ...result };
      if (!result.ok) {
        outsideResult(program, tools, session, stepped.run, result.reason, now);
        return { fingerprint: fingerprint(session, house.tools.state().tools), branches: [] };
      }
      session = finished(session, stepped.run, result);
    }
    inspect(session, tools, now);
  }
  return { fingerprint: fingerprint(session, house.tools.state().tools), branches: offered(session, tools) };
}
