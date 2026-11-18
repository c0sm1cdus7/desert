import { expect, it } from "vitest";
import ts from "typescript";
import { resolve } from "node:path";
it("types the independent positive and reports exactly each isolated static negative", () => {
  const file = resolve("tests/support/installable-type-fixture.ts");
  const source = `
import { componer, type CompositionErrors } from "../../src/runtime/distributions/compose.ts";
import type { State } from "../../src/tools/tool-contract.ts";
import type { Sample } from "./installable-program.ts";
import { sampleOptions as base, sampleProgram as p } from "./installable-program.ts";
export const good = componer(base);
export type Good = CompositionErrors<typeof base>;
const contract = { ...base, programas: [{ ...p, desert: 2 }] } as const;
const ids = { ...base, programas: [{ ...p, hechos: [] }, { ...p, hechos: [] }] } as const;
const facts = { ...base, programas: [{ ...p, hechos: [...p.hechos, ...p.hechos] }] } as const;
const foreign = { ...base, programas: [{ ...p, hechos: [{ ...p.hechos[0], nombre: "ajeno/x" }] }] } as const;
const mind = { ...base, mentes: { asistentes: false, programas: ["absent"] } } as const;
const assistants = { ...base, identidades: false, mentes: { asistentes: true, programas: [] } } as const;
const reactions = { ...base, programas: [{ ...p, effects: () => [] }] } as const;
export type Contract = CompositionErrors<typeof contract>;
export type Ids = CompositionErrors<typeof ids>;
export type Facts = CompositionErrors<typeof facts>;
export type Foreign = CompositionErrors<typeof foreign>;
export type Mind = CompositionErrors<typeof mind>;
export type Assistants = CompositionErrors<typeof assistants>;
export type Reactions = CompositionErrors<typeof reactions>;
componer(contract); componer(ids); componer(facts); componer(foreign);
componer(mind); componer(assistants); componer(reactions);
declare const state: State<Sample>;
state.tools.elsewhere;
state.tools.own.count = 42;
`;
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    allowImportingTsExtensions: true,
    exactOptionalPropertyTypes: true,
    types: ["node"],
  };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (name, language, onError, create) =>
    name === file
      ? ts.createSourceFile(name, source, options.target ?? ts.ScriptTarget.Latest, true)
      : original(name, language, onError, create);
  const program = ts.createProgram([file], options, host);
  const checker = program.getTypeChecker();
  const unit = program.getSourceFile(file);
  if (!unit) throw new Error("Missing virtual fixture");
  const actual = Object.fromEntries(
    unit.statements.filter(ts.isTypeAliasDeclaration).map(node => {
      const type = checker.getTypeAtLocation(node);
      const parts = type.isUnion() ? type.types : [type];
      return [
        node.name.text,
        parts
          .filter(p => !(p.flags & ts.TypeFlags.Never))
          .map(p => (p.isStringLiteral() ? p.value : checker.typeToString(p)))
          .sort(),
      ];
    }),
  );
  expect(actual).toEqual({
    Good: [],
    Contract: ["notas/desert:contrato-desert"],
    Ids: ["programas/notas:id-repetido"],
    Facts: ["hechos/notas/anotada:hecho-repetido"],
    Foreign: ["notas/hechos/ajeno/x:hecho-ajeno"],
    Mind: ["mentes/programas/absent:mente-ausente"],
    Assistants: ["mentes/asistentes:asistentes-requiere-identidades"],
    Reactions: ["notas/effects:reacciones-no-soportadas"],
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  expect(diagnostics.map(d => ({ file: d.file?.fileName, code: d.code }))).toEqual([
    ...Array.from({ length: 7 }, () => ({ file, code: 2345 })),
    { file, code: 2339 },
    { file, code: 2540 },
  ]);
}, 30000);
