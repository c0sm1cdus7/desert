import { expect, it } from "vitest";
import ts from "typescript";
import { resolve } from "node:path";
it("types the independent positive and reports exactly each isolated static negative", () => {
  const file = resolve("tests/support/installable-type-fixture.ts");
  const source = `
import { compose, type CompositionErrors } from "../../src/runtime/distributions/compose.ts";
import type { State } from "../../src/tools/tool-contract.ts";
import type { Sample } from "./installable-program.ts";
import { sampleOptions as base, sampleProgram as p } from "./installable-program.ts";
export const good = compose(base);
export type Good = CompositionErrors<typeof base>;
const contract = { ...base, programs: [{ ...p, desert: 2 }] } as const;
const ids = { ...base, programs: [{ ...p, facts: [] }, { ...p, facts: [] }] } as const;
const facts = { ...base, programs: [{ ...p, facts: [...p.facts, ...p.facts] }] } as const;
const foreign = { ...base, programs: [{ ...p, facts: [{ ...p.facts[0], kind: "foreign/x" }] }] } as const;
const mind = { ...base, minds: { assistants: false, programs: ["absent"] } } as const;
const assistants = { ...base, identities: false, minds: { assistants: true, programs: [] } } as const;
const reactions = { ...base, programs: [{ ...p, effects: () => [] }] } as const;
export type Contract = CompositionErrors<typeof contract>;
export type Ids = CompositionErrors<typeof ids>;
export type Facts = CompositionErrors<typeof facts>;
export type Foreign = CompositionErrors<typeof foreign>;
export type Mind = CompositionErrors<typeof mind>;
export type Assistants = CompositionErrors<typeof assistants>;
const distro = { ...base, programs: [{ ...p, dependencies: [{ kind: "distribution", name: "void" }] }] } as const;
export type Distro = CompositionErrors<typeof distro>;
export type Reactions = CompositionErrors<typeof reactions>;
// Both halves are runtime data: this type does not compare schemas or traverse contracts.
const runtime = { ...base, programs: [{
  ...p,
  offers: { loop: { version: "1", actions: {}, objects: {}, notices: {} } },
  requests: { loop: { actions: {}, objects: {}, notices: {}, cases: [] } },
}] } as const;
export type RuntimeCycle = CompositionErrors<typeof runtime>;
compose(runtime);
compose(contract); compose(ids); compose(facts); compose(foreign);
compose(mind); compose(assistants); compose(reactions); compose(distro);
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
    Contract: ["notes/desert:desert-contract"],
    Ids: ["programs/notes:duplicate-id"],
    Facts: ["facts/notes/added:duplicate-fact"],
    Foreign: ["notes/facts/foreign/x:foreign-fact"],
    Mind: ["minds/programs/absent:missing-mind"],
    Assistants: ["minds/assistants:assistants-require-identities"],
    Distro: ["notes/dependencies/void:distribution-dependency"],
    Reactions: ["notes/effects:unsupported-reactions"],
    RuntimeCycle: [],
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  expect(diagnostics.map(d => ({ file: d.file?.fileName, code: d.code }))).toEqual([
    ...Array.from({ length: 8 }, () => ({ file, code: 2345 })),
    { file, code: 2339 },
    { file, code: 2540 },
  ]);
}, 30000);
