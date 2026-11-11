// What a tool tells a person from any menu: what of it needs someone to act, and what the others did since they looked.
import { allowed, hides } from "../../house/house.ts";
import type { ProgramTool } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Notice, Tool } from "../shown-tool.ts";
import type { SurfacePorts } from "./house-ports.ts";

/** The last thing someone else wrote on each thing of a tool since this identity had that thing in front. */
function unseen<X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>) {
  const state = ports.state();
  const looked = state.looked.get(ports.me);
  const things = new Set([tool.id, ...tool.targets(state)]);
  const latest = new Map<string, (typeof state.entries)[number]>();
  for (const entry of state.entries) {
    const { tool: on, target, author, draft } = entry.data;
    const theirs = on === tool.id && author !== ports.me && !draft && things.has(target);
    if (theirs && entry.seq > (looked?.get(target) ?? 0)) latest.set(target, entry);
  }
  return [...latest.values()].sort((one, other) => other.seq - one.seq);
}
/** A tool's two lists for one identity, and how having a thing in front stops what was written on it being news. */
export function noticesOf<X extends Program>(
  ports: SurfacePorts<X>,
  tool: ProgramTool<X>,
  shown: Pick<Tool, "titleOf" | "name">,
) {
  const mine = (): boolean => allowed(ports.state().house, ports.me, tool.id);
  const titled = (target: string): string => shown.titleOf?.(target) ?? target;
  /** What needs someone to act is a thing of the tool, or the tool itself: then the row leads to its own menu. */
  const needs = (): Notice[] =>
    (tool.needs?.(ports.state(), ports.now()) ?? []).map(({ target, why }) =>
      target === tool.id ? { title: shown.name, detail: why } : { title: titled(target), detail: why, opens: target },
    );
  const news = (): Notice[] =>
    unseen(ports, tool).map(({ data }) => {
      const leads = data.target === tool.id ? {} : { opens: data.target };
      return { title: data.text, detail: data.author, ...leads };
    });
  return {
    notices: () => ({
      needs: mine() ? needs() : [],
      news: mine() ? news() : [],
      quiet: hides(ports.state().house, ports.me, "empty"),
    }),
    /** Having in front what someone else wrote on is attending it: the same act anyone does. */
    seen: (target: string): void => {
      if (mine() && unseen(ports, tool).some(entry => entry.data.target === target))
        ports.act({ act: "attend", input: { target } });
    },
  };
}
