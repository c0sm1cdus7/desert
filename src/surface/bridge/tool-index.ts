// One complete reading per tool, state version and reading instant, shared by names and searches.
import { programCall } from "../../tools/boundaries/program-call.ts";
import type { ProgramTool } from "../../tools/promises.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { SurfacePorts } from "./house-ports.ts";
import { matches } from "../finding.ts";
import { listedIn, rowsIn, type Labels } from "./rows.ts";

export function toolIndex<X extends Program>(
  ports: SurfacePorts<X>,
  tool: ProgramTool<X>,
  label: Labels,
  skipOwn: boolean,
) {
  const build = (state: State<X>, now: number) => {
    const view = programCall(tool.view.bind(tool), state, tool.id, { recentLines: Number.MAX_SAFE_INTEGER, now });
    const rows = rowsIn(skipOwn ? view.split("\n").slice(1).join("\n") : view, label);
    const targets = new Set(programCall(tool.targets.bind(tool), state));
    const named = new Map(
      rows.flatMap(row => (row.opens && targets.has(row.opens) ? [[row.opens, row] as const] : [])),
    );
    const find = (sought: string) =>
      listedIn([...targets], rows).filter(row =>
        matches([row.title, row.detail, programCall(tool.words?.bind(tool), state, row.opens ?? "")].join(" "), sought),
      );
    return { named, targets, find };
  };
  let kept: { tools: X["tools"]; through: number; now: number; index: ReturnType<typeof build> } | undefined;
  return () => {
    const state = ports.state();
    const now = ports.now();
    if (!kept || kept.tools !== state.tools || kept.through !== state.through || kept.now !== now)
      kept = { tools: state.tools, through: state.through, now, index: build(state, now) };
    return kept.index;
  };
}
