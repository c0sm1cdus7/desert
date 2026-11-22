import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";
import * as syntax from "./secret-syntax.ts";
function chain(size: number): Record<string, string> {
  const sources: Record<string, string> = {};
  for (let i = 0; i < size; i++) {
    const next = i + 1 < size ? `import { v${i + 1} } from './t${i + 1}.ts';` : `const v${i + 1} = () => 0;`;
    sources[`t${i}.ts`] =
      `${next} const table${i}: Record<string, number> = { a: ${i} };` +
      `export function v${i}(k: string): number { return (table${i}[k] ?? 0) + v${i + 1}(k); }` +
      (i === 0 ? "export const tool = { id: 't', acts: {} };" : "");
  }
  return sources;
}
it("212 cost: classifies each file once even with roots, diamonds and cycles", () => {
  const sources = {
    ...chain(20),
    "a.ts": "import './t0.ts'; import './b.ts';",
    "b.ts": "import './t0.ts'; import './a.ts';",
  };
  const spy = vi.spyOn(syntax, "boundaryEscapes");
  try {
    expect(secretBoundaryViolations(sources, { composition: [], adapters: [], custody: [], publicTypes: [] })).toEqual(
      [],
    );
    expect(spy.mock.calls.length).toBe(Object.keys(sources).length);
  } finally {
    spy.mockRestore();
  }
});
it("212 cost: one message per place and rule, with one example chain", () => {
  const sources = {
    "a.ts": "import './c.ts';",
    "b.ts": "import './c.ts';",
    "c.ts": "Reflect.get({}, 'a'); Reflect.get({}, 'b');\nimport 'node:fs';\nimport 'node:fs';",
  };
  const found = secretBoundaryViolations(sources, {
    composition: [],
    adapters: [],
    custody: [],
    publicTypes: [],
    tools: ["a.ts", "b.ts"],
  });
  expect(found).toHaveLength(4);
  expect(found.every(message => message.includes("a.ts → c.ts:"))).toBe(true);
  expect(new Set(found).size).toBe(4);
});
it("212 cost: 800 clean files take at most four times 200", () => {
  const home = mkdtempSync(join(tmpdir(), "selection-cost-"));
  const times = new Map<number, number>();
  try {
    mkdirSync(join(home, "src"));
    writeFileSync(
      join(home, "package.json"),
      JSON.stringify({ desert: { kind: "distribution", program: "src/main.ts" } }),
    );
    writeFileSync(join(home, "tsconfig.json"), "{}");
    writeFileSync(
      join(home, "src/main.ts"),
      "import { tool } from './t0.ts'; export const program = { registry: [tool] };",
    );
    for (const size of [50, 200, 400, 800]) {
      for (const [file, code] of Object.entries(chain(size))) writeFileSync(join(home, "src", file), code);
      const start = performance.now();
      expect(programSecretBoundaries(home)).toEqual([]);
      times.set(size, performance.now() - start);
    }
    console.info("212 cost ms", Object.fromEntries(times));
    expect(times.get(800) ?? Infinity).toBeLessThanOrEqual(4 * (times.get(200) ?? 0));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}, 120_000);
it("212 cost: exact aliases are not enumerated again for each import", () => {
  const sources = chain(40);
  const aliases: Record<string, string> = Object.fromEntries(
    Array.from({ length: 39 }, (_, i) => [`t${i}.ts\0./t${i + 1}.ts`, `t${i + 1}.ts`]),
  );
  let enumerations = 0;
  const indexed = new Proxy(aliases, {
    ownKeys: target => {
      enumerations++;
      return Reflect.ownKeys(target);
    },
  });
  expect(
    secretBoundaryViolations(sources, {
      composition: [],
      adapters: [],
      custody: [],
      publicTypes: [],
      aliases: indexed,
    }),
  ).toEqual([]);
  expect(enumerations).toBeLessThanOrEqual(2);
});
