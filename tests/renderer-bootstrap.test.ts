import assert from "node:assert/strict";
import test from "node:test";
import { globSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { createBuildProject } from "../src/build/svelte/project.ts";
import { program, surface } from "./fixtures/view-program.ts";

test("the shared bootstrap styles a View-only build without either legacy product renderer", { timeout: 120000 }, async () => {
  const module = `export const surface = ${JSON.stringify(surface)};
    export const viewProgram = ${JSON.stringify(program)};
    export const validateInput = () => true;`;
  const project = createBuildProject(module);
  const page = `<script lang="ts">
    import AccessGate from "@desert/svelte/catalog/compositions/access-gate/AccessGate.svelte";
    import { surface, validateInput, viewProgram } from "virtual:desert/surface";
  </script>
  {#if viewProgram}<AccessGate {viewProgram} {surface} {validateInput}/>{/if}`;
  let stop: (() => Promise<void>) | undefined;
  try {
    // Neither renderer that previously imported the theme participates in this entry.
    assert.doesNotMatch(page, /HumanProduct|PublicCatalogProduct|theme\.css/);
    writeFileSync(join(project.directory, "src/routes/+page.svelte"), page);
    await project.run("build");
    const css = globSync("**/*.css", { cwd: join(project.directory, "build/client") })
      .map(path => readFileSync(join(project.directory, "build/client", path), "utf8")).join("\n");
    assert.match(css, /--text-body:/, "the bootstrap must emit the existing typography owner");
    assert.match(css, /--background:/, "the bootstrap must emit the existing palette owner");
    assert.match(css, /\.toolbar-row/, "the bootstrap must emit the existing geometry owner");

    const { handler } = await import(pathToFileURL(join(project.directory, "build/handler.js")).href);
    const server = createServer(handler);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    stop = () => new Promise<void>((resolve, reject) => {
      server.closeAllConnections(); server.close(error => error ? reject(error) : resolve());
    });
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
      const browserPage = await context.newPage();
      await browserPage.route("**/api/**", route => new URL(route.request().url()).pathname === "/api/accessState"
        ? route.fulfill({ status: 200, json: { kind: "developer" } })
        : route.fulfill({ status: 503, body: "Controller unavailable" }));
      for (const colorScheme of ["light", "dark"] as const) {
        await browserPage.emulateMedia({ colorScheme });
        await browserPage.goto(`http://127.0.0.1:${address.port}/`);
        await browserPage.locator('html[data-renderer-profile="apple-reference"]').waitFor();
        await browserPage.locator('[data-catalog-toolbar] button').first().waitFor();
        const metrics = await browserPage.evaluate(() => {
          const body = getComputedStyle(document.body), root = getComputedStyle(document.documentElement);
          const toolbar = document.querySelector<HTMLElement>('[data-catalog-toolbar]')!;
          const geometry = getComputedStyle(toolbar), button = toolbar.querySelector('button')!;
          return { margin: body.margin, fontSize: body.fontSize, background: root.backgroundColor,
            theme: root.getPropertyValue('--background').trim(), padding: geometry.padding,
            buttonHeight: button.getBoundingClientRect().height };
        });
        assert.equal(metrics.margin, "0px");
        assert.equal(metrics.fontSize, "13px");
        assert.ok(metrics.theme.length > 0);
        assert.notEqual(metrics.background, "rgba(0, 0, 0, 0)");
        assert.equal(metrics.padding, "8px");
        assert.equal(metrics.buttonHeight, 44);
      }
    } finally { await browser.close(); }
  } finally { await stop?.(); project.close(); }
});
