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

test("empty allowed text submits and review shows an authorized effect absent from detail", { timeout: 90000 }, async () => {
  const fixture = reviewProduct({ emptyTitle: true, hideState: true });
  const { Product, Service, Web, Controller, Read, ReadStatus, fields } = fixture;
  const directory = mkdtempSync(join(tmpdir(), "desert-review-empty-"));
  const cluster = postgresCluster();
  try {
    const application = compile(Product);
    await buildDistribution(application, { distributions: [Service, Web],
      target: Web.id, outputDirectory: join(directory, "web") });
    const controller = await openLocalController(application, { ...await cluster.database(), roles: [Controller.id] });
    const actor = await controller.identities.issue("Review test owner");
    const session = controller.connect(actor.token, "human");
    const server = await serveBuiltLocalSurface({ buildDirectory: join(directory, "web"), session, port: 0 });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.setDefaultTimeout(8000);
      await page.goto(server.launchUrl);
      for (const body of ["First empty-title note", "Second empty-title note"]) {
        await page.getByRole("button", { name: "Create note", exact: true }).first().click();
        const title = page.getByRole("textbox", { name: "Title", exact: true });
        assert.equal(await title.inputValue(), "");
        assert.equal(await title.getAttribute("required"), null);
        await page.getByRole("textbox", { name: "Content", exact: true }).fill(body);
        await page.locator('[data-adaptive-surface]').getByRole("button", { name: "Create note", exact: true }).click();
        await title.waitFor({ state: "hidden" });
        const context = page.locator('[data-adaptive-surface]');
        await context.getByText(body, { exact: true }).waitFor().catch(error => { assert.deepEqual(errors, []); throw error; });
        assert.equal(await context.getByText("Status", { exact: true }).count(), 0);
        await context.getByRole("button", { name: "Archive note", exact: true }).click();
        const review = page.locator('[data-adaptive-surface]');
        await review.getByText("Status", { exact: true }).waitFor();
        await review.getByText("archived", { exact: true }).waitFor();
        assert.equal(await review.getByText(body, { exact: true }).count(), 1);
        assert.equal(await review.getByText("unexposed-private-value", { exact: true }).count(), 0);
        const before = await session.read((await session.begin(Read.id)).id);
        assert.equal(before.length, body.startsWith("First") ? 1 : 2);
        await review.getByRole("button", { name: "Archive note", exact: true }).click();
        await context.getByRole("button", { name: "Archive note", exact: true }).waitFor();
        const after = await session.read((await session.begin(Read.id)).id);
        assert.equal(after.every(record => record.facts[fields.title] === ""), true);
        const statuses = (await Promise.all(after.map(async record => session.read((await session.begin(ReadStatus.id, record.id)).id)))).flat();
        assert.equal(statuses.every(record => record.facts[fields.state] === "archived"), true);
        await context.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }).click();
        await context.waitFor({ state: "hidden" });
      }
      assert.deepEqual(errors, []);
    } finally { await browser.close(); await server.close(); await controller.close(); }
  } finally { cluster.dispose(); rmSync(directory, { recursive: true }); }
});
