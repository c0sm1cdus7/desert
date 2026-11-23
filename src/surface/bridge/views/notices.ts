// What a tool tells a person from any menu: what of it needs someone to act, and what the others did since they looked.
import { programCall } from "../../../fields/program-call.ts";
import { isMindActor } from "../../../fields/mind-actor.ts";
import { holdsAny } from "../../../house/kit.ts";
import { hides } from "../../../house/members.ts";
import type { ProgramTool } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Notice, Tool } from "../../contract/shown-tool.ts";
import { say, type SurfacePorts } from "../ports/house-ports.ts";
/** What was said in several lines is told, on a row, by its first. */
export const firstLine = (text: string): string => text.split("\n")[0] ?? "";
/** The last thing someone else wrote on each thing of a tool since this identity had that thing in front. */
function unseen<X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, attention = false) {
  const state = ports.state();
  const looked = state.looked.get(ports.me);
  const things = new Set([tool.id, ...programCall(tool.targets.bind(tool), state)]);
  const latest = new Map<string, (typeof state.entries)[number]>();
  for (const entry of state.entries) {
    const { tool: on, target, author, draft } = entry.data;
    const addressed = author !== ports.me || (attention && entry.data.attention);
    const theirs = on === tool.id && addressed && !draft && (!attention || !entry.data.silent) && things.has(target);
    if (theirs && entry.seq > (looked?.get(target) ?? 0)) latest.set(target, entry);
  }
  return [...latest.values()].sort((one, other) => other.seq - one.seq);
}
function entryNotice<X extends Program>(
  ports: SurfacePorts<X>,
  tool: string,
  data: ReturnType<typeof unseen>[number]["data"],
  name: (actor: string) => string,
): Notice {
  const leads = data.target === tool ? {} : { opens: data.target };
  return {
    title: firstLine(say(ports, data.text)),
    detail: data.diagnostic ? firstLine(data.diagnostic) : name(data.author),
    ...leads,
  };
}
/** Declared needs preserve their recipient independently of unread activity. */
function declaredNeeds<X extends Program>(
  ports: SurfacePorts<X>,
  tool: ProgramTool<X>,
  shown: Pick<Tool, "titleOf" | "name">,
): Notice[] {
  const titled = (target: string): string => shown.titleOf?.(target) ?? target;
  /** What needs someone to act is a thing of the tool, or the tool itself: then the row leads to its own menu. */
  return (programCall(tool.needs?.bind(tool), ports.state(), ports.now()) ?? [])
    .filter(
      need =>
        need.to === undefined ||
        isMindActor(need.to) ||
        !holdsAny(ports.state().house, need.to, tool.id, Object.keys(tool.acts)) ||
        need.to === ports.me,
    )
    .map(({ target, why }) =>
      target === tool.id
        ? { title: shown.name, detail: say(ports, why) }
        : { title: titled(target), detail: say(ports, why), opens: target },
    );
}
/** A tool's two lists for one identity, and how having a thing in front stops what was written on it being news. */
export function noticesOf<X extends Program>(
  ports: SurfacePorts<X>,
  tool: ProgramTool<X>,
  shown: Pick<Tool, "titleOf" | "name">,
  name: (actor: string) => string = actor => actor,
) {
  const mine = (): boolean => holdsAny(ports.state().house, ports.me, tool.id, Object.keys(tool.acts));
  return {
    notices: () => ({
      needs: mine()
        ? [
            ...declaredNeeds(ports, tool, shown),
            ...(tool.id === "identities"
              ? []
              : unseen(ports, tool, true).map(entry => entryNotice(ports, tool.id, entry.data, name))),
          ]
        : [],
      news: ports.state().house.grants.has(ports.me)
        ? unseen(ports, tool).map(entry => entryNotice(ports, tool.id, entry.data, name))
        : [],
      quiet: hides(ports.state().house, ports.me, "empty"),
    }),
    /** Having in front what someone else wrote on is attending it: the same act anyone does. */
    seen: (target: string): void => {
      if (
        ports.state().house.grants.has(ports.me) &&
        [...unseen(ports, tool), ...unseen(ports, tool, true)].some(entry => entry.data.target === target)
      )
        (ports.observe ?? ports.act)({ act: "attend", input: { target } });
    },
  };
}
