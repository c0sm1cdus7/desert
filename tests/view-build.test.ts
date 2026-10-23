import assert from "node:assert/strict";
import test from "node:test";
import { compile, composeProduct } from "../src/index.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";

test("the web module embeds the validated View program alongside canonical validation", async () => {
  const product = composeProduct(authoredNotebookSource());
  const source = await buildHumanModule(compile(product), "human");
  const built = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  assert.deepEqual(built.viewProgram, product.viewProgram);
  assert.ok(Object.isFrozen(built.viewProgram.views));
  assert.equal(typeof built.validateInput, "function");
});

test("a caller cannot substitute another View program when building a product", async () => {
  const product = composeProduct(authoredNotebookSource());
  await assert.rejects(Reflect.apply(buildHumanModule, undefined,
    [compile(product), "human", { ...product.viewProgram, style: {} }]), /VIEW_PROGRAM_OVERRIDE_FORBIDDEN/);
});
