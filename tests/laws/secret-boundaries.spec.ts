import { describe, expect, it } from "vitest";
import { secretBoundaryViolations, type SecretBoundaryPolicy } from "./secret-boundaries.ts";
const policy: SecretBoundaryPolicy = {
  composition: ["src/main.ts"],
  adapters: ["src/adapters/sign.ts"],
  custody: ["src/adapters/custody.ts"],
  publicTypes: ["src/reference.ts"],
  aliases: { "@custody": "src/adapters/custody.ts", "@common": "src/common.ts" },
};
const base = {
  "src/reference.ts": "export type SecretRef = `secret:${string}`;",
  "src/adapters/custody.ts": "export interface SecretResolver { use(ref: string, body: Function): unknown; }",
  "src/adapters/sign.ts": `import type { SecretResolver } from './custody.ts';
    export const adapter = { open: (resolver: SecretResolver) => ({
      inspect: (ref: string) => resolver.use(ref, () => ({ valid: true })) }) };`,
  "src/main.ts": "import { adapter } from './adapters/sign.ts'; export const composition = { adapter };",
};
const broken = [
  ["custodia", "import type { SecretResolver } from '../adapters/custody.ts';"],
  ["fábrica", "import { adapter as renamed } from '../adapters/sign.ts';"],
  ["reexportación", "export { adapter as renamed } from '../adapters/sign.ts';"],
  ["estrella", "export * from '../adapters/sign.ts';"],
  ["dinámica literal", "void import('../adapters/sign.ts');"],
  ["require", "const factory = require('../adapters/sign.ts');"],
  ["import equals", "import factory = require('../adapters/sign.ts');"],
  ["tipo importado", "type Renamed = import('../adapters/custody.ts').SecretResolver;"],
  ["dinámica variable", "const path = '../adapters/sign.ts'; void import(path);"],
  ["alias de ruta", "import type { SecretResolver as Borrowed } from '@custody';"],
  ["filesystem", "import { readFileSync } from 'node:fs';"],
  ["escritura", "import { writeFile } from 'fs/promises';"],
  ["base de datos", "import { DatabaseSync } from 'node:sqlite';"],
  ["proceso", "import { spawn } from 'node:child_process';"],
  ["red importada", "import http from 'node:http';"],
  ["paquete desconocido", "import io from 'unreviewed-package';"],
  ["entorno", "const material = process.env;"],
  ["alias de entorno", "const renamed = process; const { env } = renamed;"],
  ["red global", "const send = fetch;"],
  ["global calculado", "const key = 'fetch'; globalThis[key]('url');"],
  ["desestructuración global", "const { fetch: renamed } = globalThis;"],
  ["evaluación", "const escape = Function('return process');"],
  ["eval", "const run = eval;"],
  ["constructor", "const run = (() => {}).constructor('return process');"],
  ["constructor calculado", "const run = (() => {})['constructor'];"],
  ["require alias", "const load = require; load(path);"],
] as const;
describe("212: tools cannot recover material outside declared adapters", () => {
  it("accepts declared composition and public references", () => {
    expect(
      secretBoundaryViolations(
        {
          ...base,
          "src/tools/valid.ts":
            "import type { SecretRef } from '../reference.ts'; export type Input = { value: SecretRef };",
        },
        policy,
      ),
    ).toEqual([]);
  });
  for (const [name, code] of broken)
    it(`rejects ${name}`, () => {
      expect(secretBoundaryViolations({ ...base, "src/tools/leak.ts": code }, policy).length).toBeGreaterThan(0);
    });
  it("follows multiple intermediaries, aliases, reexports and cycles", () => {
    const sources = {
      ...base,
      "src/common.ts": "export * from './bridge.ts'; export * from './cycle.ts';",
      "src/cycle.ts": "export * from './common.ts';",
      "src/bridge.ts": "export { adapter as borrowed } from './adapters/sign.ts';",
      "src/tools/leak.ts": "import { borrowed } from '@common'; export const stolen = borrowed;",
    };
    expect(
      secretBoundaryViolations(sources, { ...policy, tools: ["src/tools/leak.ts"] }).some(message =>
        message.includes("src/tools/leak.ts"),
      ),
    ).toBe(true);
  });
  it("checks transitive I/O too", () => {
    const sources = {
      ...base,
      "src/tools/leak.ts": "import '../io.ts';",
      "src/io.ts": "import { readFileSync } from 'node:fs';",
    };
    expect(secretBoundaryViolations(sources, { ...policy, tools: ["src/tools/leak.ts"] }).length).toBeGreaterThan(0);
  });
  it("rejects an alias in the inferred factory output", () => {
    const sources = {
      ...base,
      "src/adapters/sign.ts": `import type { SecretResolver as Alias } from "@custody";
      export const adapter = { open: (other: Alias) => ({ leak: () => other }) };`,
    };
    expect(secretBoundaryViolations(sources, policy).length).toBeGreaterThan(0);
  });
  for (const factory of [
    `const open = (renamed: Alias) => ({ leak: () => renamed }); export const adapter = { open };`,
    `export const adapter = { 'open': (renamed: Alias) => ({ leak: async () => renamed }) };`,
  ])
    it("follows shorthand factories and asynchronous inferred results", () => {
      const sources = {
        ...base,
        "src/adapters/sign.ts": `import type { SecretResolver as Alias } from './custody.ts'; ${factory}`,
      };
      expect(secretBoundaryViolations(sources, policy).length).toBeGreaterThan(0);
    });
  it("rejects a resolver returned by a renamed factory parameter", () => {
    const sources = {
      ...base,
      "src/adapters/sign.ts": `
      import type { SecretResolver } from './custody.ts';
      export const adapter = { open: (renamed: SecretResolver) => ({ leak: () => ({ nested: renamed }) }) };`,
    };
    expect(secretBoundaryViolations(sources, policy).length).toBeGreaterThan(0);
  });
  it("rejects a borrowed capability in the context, including type aliases", () => {
    const sources = {
      ...base,
      "src/context.ts": `
      import type { SecretResolver as Borrowed } from './adapters/custody.ts';
      type Alias = Borrowed; export interface ActContext { borrowed: Alias }`,
    };
    expect(secretBoundaryViolations(sources, policy).length).toBeGreaterThan(0);
  });
  it("does not reject comments, text or an ordinary member named fetch", () => {
    expect(
      secretBoundaryViolations(
        {
          ...base,
          "src/tools/valid.ts":
            "// process.env\nconst text = 'eval'; const port = { fetch: () => text }; port.fetch();",
        },
        policy,
      ),
    ).toEqual([]);
  });
});
