// Adversarial repositories prove that each missing catalog obligation makes the gate red.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { catalogLaws } from "./catalog-coverage.ts";
function inspect(files: Readonly<Record<string, string>>) {
  const root = mkdtempSync(join(tmpdir(), "desert-catalog-law-"));
  try {
    for (const [name, text] of Object.entries(files)) {
      const path = join(root, name);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, text);
    }
    return catalogLaws({ root, code: ["src"] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const factories = `export const programAct = (value: unknown) => value;
export const effect = (kind: string) => ({kind});`;
it("turns red for an action that no catalog registers, even when its test calls it", () => {
  const failures = inspect({
    "src/factory.ts": factories,
    "src/orphan.ts": `import {programAct} from './factory.ts'; export const orphan = programAct({});`,
    "src/orphan.spec.ts": `import {orphan} from './orphan.ts'; console.log(orphan);`,
  });
  expect(failures.some(text => text.includes("E-L6-ACTION"))).toBe(true);
});
it("turns red for a state-changing fact without a registered action emitter", () => {
  const failures = inspect({
    "src/factory.ts": factories,
    "src/host.ts": `import {effect} from './factory.ts'; export function host(){return effect('unowned-change')}`,
  });
  expect(failures.some(text => text.includes("E-L6-FACT · hecho sin acción registrada · unowned-change"))).toBe(true);
});
it("turns red for a catalog text used only by its test", () => {
  const failures = inspect({
    "src/texts/words.ts": `export const words = {shown:'Visible', forgotten:'Olvidado', 'quoted-unused':'Sin uso'};`,
    "src/screen.ts": `import {words} from './texts/words.ts'; console.log(words.shown);`,
    "src/words.spec.ts": `import {words} from './texts/words.ts'; console.log(words.forgotten);`,
  });
  expect(failures.some(text => text.includes("E-L6-TEXT · texto sin uso · forgotten"))).toBe(true);
  expect(failures.some(text => text.includes("E-L6-TEXT · texto sin uso · shown"))).toBe(false);
  expect(failures.some(text => text.includes("E-L6-TEXT · texto sin uso · quoted-unused"))).toBe(true);
});
it("turns red for test-only exports but admits the public testing contract", () => {
  const failures = inspect({
    "src/helper.ts": `export const dead = () => 1; export const fixture = () => 2;`,
    "src/testing.ts": `export {fixture} from './helper.ts';`,
    "src/helper.spec.ts": `import {dead,fixture} from './helper.ts'; console.log(dead(),fixture());`,
  });
  expect(failures.some(text => text.includes("E-L6-EXPORT · exportado usado sólo por pruebas · dead"))).toBe(true);
  expect(failures.some(text => text.includes("E-L6-EXPORT · exportado usado sólo por pruebas · fixture"))).toBe(false);
});
it.each([
  { exports: { "./public": "./src/public.ts" }, path: "src/public.ts" },
  { exports: { "./public": { import: "./src/public.ts", default: "./src/public.ts" } }, path: "src/public.ts" },
  { exports: { "./public/*": "./src/public/*.ts" }, path: "src/public/index.ts" },
  { exports: "./src/public.ts", path: "src/public.ts" },
])("recognizes published exports without excusing unpublished test helpers (%j)", ({ exports, path }) => {
  const helper = path === "src/public.ts" ? "./helper.ts" : "../helper.ts";
  const failures = inspect({
    "package.json": JSON.stringify({ exports }),
    "src/helper.ts": "export const internal = () => 1; export const published = () => 2;",
    [path]: `export {published} from '${helper}'; export const entry = () => 4;`,
    "src/helper.spec.ts": `import {internal,published} from './helper.ts';
      import {entry} from '${path.replace("src/", "./")}'; console.log(internal(),published(),entry());`,
    "src/unpublished.ts": "export const dead = () => 3;",
    "src/unpublished.spec.ts": "import {dead} from './unpublished.ts'; console.log(dead());",
  });
  for (const name of ["published", "entry"])
    expect(failures.some(text => text.includes(`E-L6-EXPORT · exportado usado sólo por pruebas · ${name}`))).toBe(
      false,
    );
  for (const name of ["internal", "dead"])
    expect(failures.some(text => text.includes(`E-L6-EXPORT · exportado usado sólo por pruebas · ${name}`))).toBe(true);
});
it("recognizes the gate's declared composition without excusing neighboring test helpers", () => {
  const failures = inspect({
    "package.json": JSON.stringify({
      desert: { program: "src/program.ts", testDistribution: "tests/distribution.ts" },
    }),
    "src/program.ts": "export const program = {}; export const dead = () => 1;",
    "tests/distribution.ts": "import {program as artifact} from '../src/program.ts'; export const program = artifact;",
    "src/program.spec.ts": "import {dead} from './program.ts'; console.log(dead());",
  });
  expect(failures.some(text => text.includes("E-L6-EXPORT · exportado usado sólo por pruebas · program"))).toBe(false);
  expect(failures.some(text => text.includes("E-L6-EXPORT · exportado usado sólo por pruebas · dead"))).toBe(true);
});
it("follows registered aliases and action helpers to the emitted fact", () => {
  expect(
    inspect({
      "src/factory.ts": factories,
      "src/action.ts": `import {programAct,effect} from './factory.ts';
      function emit(){return effect('owned-change')}; export const action = programAct({run:emit});`,
      "src/catalog.ts": `import {action as chosen} from './action.ts'; export const tool = {acts:{chosen}};`,
    }),
  ).toEqual([]);
});

it("turns red for an installable program fact declared but never emitted", () => {
  const failures = inspect({
    "src/program.ts": `const changes = [{kind:"forgotten-change",schema:{}}];
        export const program={facts:changes,tools:{notes:{acts:{}}}};`,
  });
  expect(failures.some(text => text.includes("E-L6-FACT · hecho sin acción registrada · forgotten-change"))).toBe(true);
});

it("accepts an installable fact emitted as a registered action's literal effect", () => {
  expect(
    inspect({
      "src/factory.ts": factories,
      "src/program.ts": `import {programAct} from './factory.ts'; const changes=[{kind:"owned",schema:{}}];
      export const program={facts:changes,tools:{notes:{acts:{
      write:programAct({run:()=>({effects:[{layer:"program",kind:"owned",data:{}}]})})}}}};`,
    }),
  ).toEqual([]);
});
