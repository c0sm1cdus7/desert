import { expect, it } from "vitest";
import ts from "typescript";
import { resolve } from "node:path";
import { Type } from "@sinclair/typebox";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../tests/support/shop.ts";
import { toolAct } from "./act-definition.ts";
import type { Tool } from "./tool-contract.ts";

const file = resolve("virtual-opacity-contract.mts");
function diagnostics(body: string) {
  const code = `import type { ActContext, Program, Tool } from './src/tools/tool-contract.ts';
    declare const context: ActContext<Program>;
    declare const startup: Parameters<NonNullable<Tool<Program>['start']>>[0]; ${body}`;
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    types: ["node"],
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    allowImportingTsExtensions: true,
  };
  const host = ts.createCompilerHost(options),
    read = host.getSourceFile.bind(host);
  host.getSourceFile = (path, language, ...args) =>
    path === file ? ts.createSourceFile(path, code, language, true) : read(path, language, ...args);
  return ts.getPreEmitDiagnostics(ts.createProgram([file], options, host));
}
it("el programa de control compila sin errores ajenos al contrato", () => {
  expect(diagnostics("const by: string = context.by;").map(d => d.code)).toEqual([]);
});
for (const body of [
  'void context.keys.get("synthetic");',
  'const { keys: renamed } = context; void renamed.get("synthetic");',
  'void startup.keys.get("synthetic");',
  'void startup.secrets.scrub("synthetic");',
  "void context.resolver;",
])
  it(`el programa roto no compila: ${body}`, () => {
    const found = diagnostics(body);
    expect(found.some(d => d.file?.fileName === file && d.code === 2339)).toBe(true);
  });
it("ni la acción ni el arranque reciben almacén, custodia o resolvedor", () => {
  const seen: unknown[] = [];
  const probe: Tool<Shop> = {
    id: "probe",
    purpose: "Prueba de capacidades",
    targets: () => [],
    view: () => "",
    summary: () => "",
    start: ports => {
      seen.push(ports);
      return () => {};
    },
    acts: {
      see: toolAct(Type.Object({}), (_, context) => {
        seen.push(context);
        return { status: "accepted" };
      }),
    },
  };
  const rig = shopRig({ registry: [...shopRegistry, probe] });
  try {
    rig.attend("ana", "probe");
    expect(rig.act("ana", "see", {}, "probe").status).toBe("accepted");
    expect(seen).toHaveLength(2);
    for (const value of seen)
      for (const key of ["keys", "secrets", "resolver", "capabilities"]) expect(value).not.toHaveProperty(key);
  } finally {
    rig.close();
  }
});
