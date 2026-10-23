import assert from "node:assert/strict";
import { test } from "node:test";
import { assertProductSource } from "../src/authoring/index.ts";
import { sourceFixture } from "./fixtures/module-catalog-source.ts";

test("registered activity constructors remain declarative product authoring, not runtime callbacks", async () => {
  await sourceFixture({
    "root.product.ts": 'import { composeProduct } from "desert-sdk/src/index.ts"; export const Product = composeProduct({});',
    "journeys/guided.journey.ts": `import { activityInputs, activityExperience } from "desert-sdk/src/index.ts";
      const operation = {}; const source = {}; const screen = {};
      const inputs = activityInputs(operation);
      export const Guided = activityExperience({ journey: operation,
        steps: [{ view: screen, inputs: [inputs.title] }], review: screen }, source);`,
  }, async path => assert.equal((await assertProductSource(path)).files.length, 2));
});
