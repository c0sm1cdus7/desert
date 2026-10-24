import assert from "node:assert/strict";
import test from "node:test";
import { assertProductSource } from "../src/authoring/index.ts";
import { sourceFixture } from "./fixtures/module-catalog-source.ts";

const root = 'import { composeProduct } from "desert-sdk/src/index.ts"; export const Product = composeProduct({});';

test("the source gate admits component constructors from the actual SDK catalog, including import aliases", async () => {
  for (const catalog of ["Components", "Components as Pieces"]) {
    const local = catalog.endsWith("Pieces") ? "Pieces" : "Components";
    await sourceFixture({ "root.product.ts": root, "views/home.view.ts":
      `import { ${catalog}, ViewTitles, defineView } from "desert-sdk/src/index.ts";
       export const Home = defineView({ name: "home", content: [${local}.Header({ title: ViewTitles.product })] });`,
    }, async path => assert.equal((await assertProductSource(path)).files.length, 2));
  }
});

test("catalog constructor admission cannot be forged, indexed, rebound or invoked through function helpers", async () => {
  const cases = [
    'import { Components } from "desert-sdk/src/index.ts"; export const Value = Components.Unknown({});',
    'import { Components } from "desert-sdk/src/index.ts"; export const Value = Components["Header"]({title:"Home"});',
    'import { Components } from "desert-sdk/src/index.ts"; export const Value = Components.Header.call(null, {title:"Home"});',
    'import { Components } from "desert-sdk/src/index.ts"; export const Value = Components.Header?.({title:"Home"});',
    'import { Components } from "desert-sdk/src/index.ts"; export const Value = Components?.Header({title:"Home"});',
    'import { Components } from "desert-sdk/src/index.ts"; const Pieces = Components; export const Value = Pieces.Header({title:"Home"});',
    'const Components = { Header: "not-an-sdk-function" }; export const Value = Components.Header({title:"Home"});',
  ];
  for (const source of cases) await sourceFixture({ "root.product.ts": root, "views/home.view.ts": source },
    async path => assert.rejects(assertProductSource(path), /PRODUCT_CALL_NOT_ALLOWED/));
});
