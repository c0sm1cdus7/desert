import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import { root } from "../support/sources.ts";
// The second review's four forgeries must fail without casts, as must choosing any author.
it("256: startup emit accepts only issued credential commands and authorless wake requests", () => {
  const file = join(root, "tests/support/startup-type-probe.ts");
  const code = `
import { effect } from "../../src/journal/events.ts";
import type { ToolStartup } from "../../src/tools/startup-contract.ts";
import { shop, type Shop } from "./shop.ts";
export function probe(s: ToolStartup<Shop>) {
  s.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
  s.bus.emit(effect("handed", { to: "beto" }, "ana"));
  s.bus.emit(shop.fact("sale-registered", { sale: "fake", total: 1 }, "ana"));
  s.bus.emit({ layer: "house", kind: "granted", by: "ana", cause: [], data: { identity: "eve", tools: [] } });
  s.bus.emit(effect("tool-entry", { tool: "desk", target: "desk", author: "mind:desk", text: "" }, "mind:desk"));
  s.bus.emit({ layer: "house", kind: "wake-at", by: "mind:desk", data: { id: "desk:x", at: 0 } });
  s.bus.emit(s.credentials.replace("slot", {}, 0));
  s.bus.emit(s.credentials.release("slot", 0));
  s.bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:x", at: null } });
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
  expect(
    diagnostics.filter(d => d.file?.fileName !== file).map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")),
  ).toEqual([]);
  expect(diagnostics.map(d => d.code)).toEqual([2769, 2769, 2769, 2769, 2769, 2769]);
});
