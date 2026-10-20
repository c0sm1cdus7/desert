import { chromium, type Browser, type Request } from "playwright";
import { resolve } from "node:path";
import { servePublicCatalog } from "../../src/build/public-catalog/serve.ts";
import { loadLandmarks } from "../../products/landmarks/product.ts";
import { observeDiagnostics } from "./public-catalog-diagnostics.ts";
import { readOnlyRequests } from "./public-catalog-expectations.ts";

export async function publicCatalogFixture(expectedCancellation?: (request: Request) => boolean) {
  const { application, sourceRoot } = loadLandmarks();
  const server = await servePublicCatalog({
    buildDirectory: resolve(process.env.DESERT_CATALOG_BUILD ?? "build/landmarks-web-v1"), sourceRoot, assets: application.assets,
  });
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 900, height: 450 }, deviceScaleFactor: 2, colorScheme: "dark" });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const diagnostics = observeDiagnostics(page, expectedCancellation), readonly = readOnlyRequests(page);
    await page.goto(server.origin);
    const runningBrowser = browser;
    return { page, browser: runningBrowser, context, origin: server.origin, diagnostics,
      async close() {
        try { readonly(); diagnostics.assertClean(); }
        finally { try { await runningBrowser.close(); } finally { await server.close(); } }
      },
    };
  } catch (error) {
    try { await browser?.close(); } finally { await server.close(); }
    throw error;
  }
}
