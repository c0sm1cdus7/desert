import { chromium, type Locator, type Page } from "playwright";
import { compile } from "../../src/index.ts";
import { openLocalController } from "../../src/local.ts";
import { serveBuiltLocalSurface } from "../../src/build/serve.ts";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { NotebookProduct } from "../../products/notebook/product.ts";
import { postgresCluster } from "../fixtures/postgres.ts";

export async function settleMotion(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})));
  });
}

export const activePanel = (page: Page) => page.locator("[data-adaptive-surface]");
export const panelToolbar = (page: Page, slot: "top" | "bottom") => activePanel(page).locator(`[data-surface-slot="${slot}"]`);
export async function waitForEnabled(button: Locator, enabled = true) {
  await button.and(button.page().locator(enabled ? ":enabled" : ":disabled")).waitFor();
}
export async function waitForNote(page: Page, title: string) {
  await activePanel(page).locator("[data-toolbar-title]").getByText(title, { exact: true }).waitFor();
  await activePanel(page).getByRole("button", { name: "Archive note", exact: true }).waitFor();
  await settleMotion(page);
}

type FixtureApplication = ReturnType<typeof compile>;
export async function browserFixture(options?: { application: FixtureApplication; buildDirectory: string }) {
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
  const application = options?.application ?? compile(NotebookProduct);
  const host = await openLocalController(application, { ...database, roles: ["notes"] });
  cleanup.push(() => host.close());
  const identity = await host.identities.issue("Browser owner");
  const session = host.connect(identity.token, "human");
  const server = await serveBuiltLocalSurface({ session, port: 0,
    buildDirectory: options?.buildDirectory ?? (process.env.DESERT_WEB_BUILD ? resolve(process.env.DESERT_WEB_BUILD)
      : fileURLToPath(new URL("../../build/notebook-web", import.meta.url))) });
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
  await page.getByRole("button", { name: "Create note", exact: true }).first().waitFor();
  await page.waitForFunction(() => {
    const create = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute("aria-label") === "Create note");
    return create && !create.disabled;
  });
  return { cluster, database, application, host, identity, session, server, browser, context, page, errors, close };
  } catch (error) {
    try { await close(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], "BROWSER_FIXTURE_SETUP_FAILED"); }
    throw error;
  }
}
