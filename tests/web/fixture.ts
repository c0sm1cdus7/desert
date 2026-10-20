import { chromium, type Page } from "playwright";
import { compile } from "../../src/compile.ts";
import { openLocalController } from "../../src/local.ts";
import { serveBuiltLocalSurface } from "../../src/build/serve.ts";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Notebook } from "../../products/notebook/product.ts";
import { postgresCluster } from "../fixtures/postgres.ts";

export async function settleMotion(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})));
  });
}

export async function browserFixture() {
  const cluster = postgresCluster();
  const cleanup: (() => void | Promise<void>)[] = [() => cluster.dispose()];
  async function close() {
    const failures: unknown[] = [];
    for (const dispose of cleanup.splice(0).reverse()) {
      try { await dispose(); } catch (error) { failures.push(error); }
    }
    if (failures.length) throw new AggregateError(failures, "BROWSER_FIXTURE_CLEANUP_FAILED");
  }
  try {
  const database = await cluster.database();
  const application = compile(Notebook);
  const host = await openLocalController(application, { ...database, role: "notes" });
  cleanup.push(() => host.close());
  const identity = await host.identities.issue("Browser owner");
  const session = host.connect(identity.token, "human");
  const server = await serveBuiltLocalSurface({ session, port: 0,
    buildDirectory: process.env.DESERT_WEB_BUILD ? resolve(process.env.DESERT_WEB_BUILD)
      : fileURLToPath(new URL("../../build/notebook-web", import.meta.url)) });
  cleanup.push(() => server.close());
  const browser = await chromium.launch({ headless: true });
  cleanup.push(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /Content Security Policy|unsafe-eval/.test(message.text())) errors.push(message.text()); });
  await page.goto(server.launchUrl);
  await page.getByText("Local controller ready", { exact: true }).waitFor();
  return { cluster, database, application, host, identity, session, server, browser, context, page, errors, close };
  } catch (error) {
    try { await close(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], "BROWSER_FIXTURE_SETUP_FAILED"); }
    throw error;
  }
}
