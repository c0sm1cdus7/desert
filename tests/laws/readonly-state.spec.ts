import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import { root } from "../support/sources.ts";
it("256: program state is deeply read-only in startup, views, acts and calculations", () => {
  const file = join(root, "tests/support/readonly-type-probe.ts");
  const code = `
import type { ToolStartup } from "../../src/tools/startup-contract.ts";
import type { State, Tool, Slices, ActContext } from "../../src/tools/tool-contract.ts";
import type { Foreign } from "../../src/journal/vocabulary.ts";
type Demo = { fact: Foreign; tools: { nested: { map: Map<string, { n: number }>; set: Set<{ n: number }>;
  list: { n: number }[]; date: Date } } };
export function probe(start: ToolStartup<Demo>, state: State<Demo>, act: ActContext<Demo>,
  view: Parameters<Tool<Demo>["view"]>[0], kept: Parameters<Slices<Demo>["step"]["nested"]>[0]) {
  start.state().house.admin = "beto";
  start.state().house.kits.set("mind:desk", new Map());
  start.state().house.kits.get("mind:desk")?.set("desk", null);
  start.state().house.grants.get("ana")?.push("desk");
  start.state().wakeOwners.clear();
  state.tools.nested.map.set("x", { n: 1 });
  const item = state.tools.nested.map.get("x");
  if (item) item.n = 2;
  state.tools.nested.set.add({ n: 1 });
  for (const item of state.tools.nested.set) item.n = 2;
  state.tools.nested.list.push({ n: 1 });
  state.tools.nested.list[0]!.n = 2;
  state.tools.nested.date.setTime(1);
  act.state.tools.nested.list.length = 0;
  view.tools.nested.map.clear();
  kept.list.pop();
  const entry = state.entries[0];
  entry?.data.made?.push("fake");
  // Object.assign and explicit type assertions cannot be forbidden by TypeScript: runtime rejects them.
  Object.assign(start.state().house, { admin: "beto" });
  state.tools.nested.map.get("x");
  [...state.tools.nested.set];
}`;
  const options: ts.CompilerOptions = {
    types: ["node"],
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    module: ts.ModuleKind.NodeNext,
    allowImportingTsExtensions: true,
  };
  const host = ts.createCompilerHost(options),
    read = host.getSourceFile.bind(host);
  host.getSourceFile = (path, language, ...args) =>
    path === file ? ts.createSourceFile(file, code, language, true) : read(path, language, ...args);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], options, host));
  expect(diagnostics.filter(d => d.file?.fileName !== file).map(d => d.code)).toEqual([]);
  expect(diagnostics).toHaveLength(16);
  expect(diagnostics.every(d => [2339, 2540, 2551].includes(d.code))).toBe(true);
});
