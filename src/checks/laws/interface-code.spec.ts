// Planted programs: every way of writing interface is refused with its line, and the exemption map stays exact.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { interfaceCode } from "./interface-code.ts";
import { programLaws } from "./program-laws.ts";
import { programLawOptions } from "./program-law-options.ts";
import { lawOptions, lawPackage, lawRepository } from "../../../tests/support/law-repository.ts";

const none = { exempt: {} };
it.each([
  ["src/view.svelte", "src/view.svelte: .svelte"],
  ["src/App.tsx", "src/App.tsx: .tsx"],
  ["web/page.HTML", "web/page.HTML: .html"],
  ["styles/app.css", "styles/app.css: .css"],
  ["styles/app.scss", "styles/app.scss: .scss"],
])("I1: refuses a file that is interface by its kind, anywhere in the repo: %s", (path, line) => {
  expect(interfaceCode(lawRepository({ [path]: "" }), none)).toEqual([line]);
});
it("I1: reads no installed package and no hidden folder", () => {
  const repo = lawRepository({ "node_modules/ui/index.html": "", ".cache/page.css": "" });
  expect(interfaceCode(repo, none)).toEqual([]);
});
it.each([
  ['import "svelte";', "svelte"],
  ['import { mount } from "svelte";', "svelte"],
  ['export * from "react";', "react"],
  ['import { createRoot } from "react-dom/client";', "react-dom/client"],
  ['type Kit = import("@sveltejs/kit").Load;', "@sveltejs/kit"],
  ['const vue = import("vue");', "vue"],
  ['const paint = require("chalk");', "chalk"],
  ['import "@angular/core";', "@angular/core"],
  ['import "@capacitor/core";', "@capacitor/core"],
  ['import "ink";', "ink"],
  ['import "desert/surface/pieces";', "desert/surface/pieces"],
  ['import type { Screen } from "desert/surface/contract";', "desert/surface/contract"],
])("I2: refuses an import of what paints: %s", (code, specifier) => {
  expect(interfaceCode(lawRepository({ "src/a.ts": code }), none)).toEqual([`src/a.ts → ${specifier}`]);
});
it("I2: admits what does not paint, among them a name that only starts like a framework", () => {
  const code = 'import "desert/programa"; import "lite"; import "inkwell"; import "./b.ts"; import "node:fs";';
  expect(interfaceCode(lawRepository({ "src/a.ts": code, "src/b.ts": "export {};" }), none)).toEqual([]);
});
it("I3: refuses a framework among the dependencies or the development dependencies", () => {
  const manifest = {
    ...lawPackage,
    dependencies: { react: "19.0.0", "@sinclair/typebox": "0.34.52" },
    devDependencies: { "@capacitor/core": "7.0.0", typescript: "6.0.3" },
  };
  const repo = lawRepository({ "package.json": JSON.stringify(manifest) });
  expect(interfaceCode(repo, none)).toEqual(["package.json → react", "package.json → @capacitor/core"]);
});
it.each([
  ['const clear = "\\x1b[2J";', String.raw`"\u001b[2J"`],
  ["const title = `\\x1b]0;${name}\\x07`;", String.raw`"\u001b]0;"`],
  ['const csi = "\\u009b1m";', String.raw`"\u009b1m"`],
  ['const page = "<!DOCTYPE html>";', '"<!DOCTYPE html>"'],
  ['const block = "<DIV class=wide>";', '"<DIV class=wide>"'],
  ["const word = `<span>${name}</span>`;", '"<span>"'],
  ['const link = "<a href=x>";', '"<a href=x>"'],
])("I4: refuses bytes painted by hand: %s", (code, shown) => {
  expect(interfaceCode(lawRepository({ "src/a.ts": code }), none)).toEqual([`src/a.ts: ${shown}`]);
});
it("I4: admits a plain < and a word in angle brackets that is no element", () => {
  const code = 'const a = "<dynamic>"; const b = "a < b"; const c = "<abbr>"; const d = "<pre>"; const e = "\\x1b";';
  expect(interfaceCode(lawRepository({ "src/a.ts": code }), none)).toEqual([]);
});
it.each([
  ['const p = document.createElement("p");', "document.createElement"],
  ['const p = document["querySelector"]("p");', 'document["querySelector"]'],
  ["const b = document.body;", "document.body"],
  ["class Card extends HTMLElement {}", "HTMLElement"],
  ['customElements.define("x-card", Card);', "customElements"],
])("I5: refuses a browser's drawing interface: %s", (code, use) => {
  expect(interfaceCode(lawRepository({ "src/a.ts": code }), none)).toEqual([`src/a.ts: ${use}`]);
});
it("I5: admits the word document and names that only are its own", () => {
  const code =
    "const document = { title: 1 }; const t = document.title; const o = { HTMLElement: 1, customElements: 2 };" +
    " const h = o.HTMLElement; const page = archive.document.body;";
  expect(interfaceCode(lawRepository({ "src/a.ts": code }), none)).toEqual([]);
});
it("reads no spec: a check may hold the bytes it expects to see", () => {
  const code = 'import "svelte"; const clear = "\\x1b[2J"; const p = document.createElement("p");';
  expect(interfaceCode(lawRepository({ "src/a.spec.ts": code }), none)).toEqual([]);
});
it("a clean program passes, and an exemption with its reason admits what it names", () => {
  expect(interfaceCode(lawRepository({}), none)).toEqual([]);
  const repo = lawRepository({ "src/paint.ts": 'const clear = "\\x1b[2J";', "web/app.css": "" });
  const exempt = { "src/paint.ts": "the painter of this distribution", "web/": "its stylesheets" };
  expect(interfaceCode(repo, { exempt })).toEqual([]);
});
it("refuses a stale exemption: one whose path is gone, and one that admits nothing the law finds", () => {
  const repo = lawRepository({});
  const exempt = { "src/gone.ts": "it was a painter", "src/a.ts": "it paints nothing" };
  expect(interfaceCode(repo, { exempt })).toEqual(["src/gone.ts", "src/a.ts"]);
});
it("a program that leaves desert.laws.interface out does not start its laws", async () => {
  const { interface: _left, ...rest } = lawOptions;
  const repo = lawRepository({ "package.json": JSON.stringify({ ...lawPackage, desert: { laws: rest } }) });
  expect(() => programLawOptions(repo.root)).toThrow("desert.laws.interface");
  writeFileSync(
    join(repo.root, "package.json"),
    JSON.stringify({ ...lawPackage, desert: { laws: { ...lawOptions, interface: { "src/a.ts": "" } } } }),
  );
  expect(() => programLawOptions(repo.root)).toThrow("desert.laws.interface");
  await expect(programLaws(repo.root)).rejects.toThrow("desert.laws.interface");
});
it("runs with the ordinary repository laws of every program and distribution", async () => {
  const repo = lawRepository({ "src/a.ts": 'import "svelte";' });
  expect(await programLaws(repo.root)).toContain("src/a.ts → svelte");
});
