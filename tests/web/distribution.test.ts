import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { compile } from "../../src/index.ts";
import { buildDistribution } from "../../src/build/index.ts";
import { serveBuiltLocalSurface } from "../../src/build/serve.ts";
import { openLocalController } from "../../src/local.ts";
import { reviewProduct } from "../fixtures/review-product.ts";
import { postgresCluster } from "../fixtures/postgres.ts";

test("a renamed product can invoke a journey named accept and review it without renderer-operation collisions", { timeout: 90000 }, async () => {
  const { Product, Service, Web, Controller, Read, Create, fields } = reviewProduct({ renamed: true, createReview: true });
  const createId = Create.id;
  assert.equal(createId, "accept", "an authored journey may use the same word as a renderer operation");
  const directory = mkdtempSync(join(tmpdir(), "desert-browser-build-"));
  const cluster = postgresCluster();
  try {
    const application = compile(Product);
    await buildDistribution(application, { distributions: [Service, Web], target: Web.id, outputDirectory: join(directory, "web") });
    const controller = await openLocalController(application, { ...await cluster.database(), roles: [Controller.id] });
    const actor = await controller.identities.issue("Renamed owner");
    const session = controller.connect(actor.token, "human");
    const server = await serveBuiltLocalSurface({ buildDirectory: join(directory, "web"), session, port: 0 });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.setDefaultTimeout(8000);
      await page.goto(server.launchUrl);
      await page.getByRole("button", { name: "Create note", exact: true }).first().click();
      await page.getByRole("textbox", { name: "Title", exact: true }).fill("Renamed product");
      await page.getByRole("textbox", { name: "Content", exact: true }).fill("Same renderer, different contract.");
      await page.locator('[data-adaptive-surface]').getByRole("button", { name: "Review", exact: true }).click();
      await page.locator('[data-adaptive-surface] [data-toolbar-title]').filter({ hasText: "Review · Create note" }).waitFor();
      assert.deepEqual(await session.read((await session.begin(Read.id)).id), []);
      await page.locator('[data-adaptive-surface]').getByRole("button", { name: "Create note", exact: true }).click();
      await page.getByRole("textbox", { name: "Title", exact: true }).waitFor({ state: "hidden" });
      await page.locator('[data-adaptive-surface]').getByText("Same renderer, different contract.", { exact: true }).waitFor();
      const records = await session.read((await session.begin(Read.id)).id);
      assert.equal(records.length, 1);
      assert.equal(records[0]!.facts[fields.title], "Renamed product");
      assert.deepEqual(errors, []);
    } finally { await browser.close(); await server.close(); await controller.close(); }
  } finally { cluster.dispose(); rmSync(directory, { recursive: true }); }
});
