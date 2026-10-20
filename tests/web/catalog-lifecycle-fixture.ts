import { webkit } from 'playwright';
import { resolve } from 'node:path';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { servePublicCatalog } from '../../src/build/public-catalog/serve.ts';
import { loadLandmarks } from '../../products/landmarks/product.ts';
import { observeDiagnostics } from './public-catalog-diagnostics.ts';
import { readOnlyRequests } from './public-catalog-expectations.ts';

/** Optional locally installed WebKit; never downloads or silently substitutes engines. */
export async function catalogLifecycleFixture() {
  if (process.env.DESERT_LIFECYCLE_BROWSER !== 'webkit') return publicCatalogFixture();
  const { application, sourceRoot } = loadLandmarks();
  const server = await servePublicCatalog({
    buildDirectory: resolve(process.env.DESERT_CATALOG_BUILD ?? 'build/landmarks-integration-v104m'),
    sourceRoot, assets: application.assets,
  });
  try {
    const browser = await webkit.launch({ headless: true,
      ...(process.env.DESERT_WEBKIT_EXECUTABLE ? { executablePath: process.env.DESERT_WEBKIT_EXECUTABLE } : {}) });
    try {
      const context = await browser.newContext({ viewport: { width: 900, height: 450 }, deviceScaleFactor: 2, colorScheme: 'dark' });
      const page = await context.newPage(); page.setDefaultTimeout(8000);
      const diagnostics = observeDiagnostics(page), readonly = readOnlyRequests(page);
      await page.goto(server.origin);
      return { page, browser, context, origin: server.origin, diagnostics,
        async close() {
          try { readonly(); diagnostics.assertClean(); }
          finally { try { await browser.close(); } finally { await server.close(); } }
        },
      };
    } catch (error) { await browser.close(); throw error; }
  } catch (error) { await server.close(); throw error; }
}
