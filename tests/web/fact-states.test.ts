import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

test("published fact specimens distinguish content, empty and unknown without adding controls", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture(), failures: string[] = [];
  const revision = basename(process.env.DESERT_CATALOG_BUILD ?? "unknown");
  const directory = resolve("artifacts/fact-state-presentation", revision);
  await mkdir(directory, { recursive: true });
  try {
    await (await navigationAction(f.page, "Component bank")).click();
    await f.page.getByRole("searchbox", { name: "Find component", exact: true }).fill("fact");
    for (const colorScheme of ["light", "dark"] as const) for (const width of [1280, 320]) {
      await f.page.emulateMedia({ colorScheme });
      await f.page.setViewportSize({ width, height: 900 });
      await settle(f.page);
      const region = f.page.getByRole("region", { name: "fact", exact: true });
      await region.scrollIntoViewIfNeeded();
      const accessible = await region.ariaSnapshot();
      const rows = await region.locator("dd").evaluateAll(values => values.map(element => {
        const content = element.lastElementChild ?? element, style = getComputedStyle(content);
        const box = element.getBoundingClientRect(), icon = element.querySelector("svg");
        return { text: element.textContent?.trim(), color: style.color,
          glyph: icon?.innerHTML ?? null, hiddenGlyph: icon?.getAttribute("aria-hidden"),
          overflow: element.scrollWidth > element.clientWidth + 1,
          inViewport: box.left >= 0 && box.right <= innerWidth + 1 };
      }));
      const key = `${colorScheme}-${width}`;
      if (rows.length !== 3) failures.push(`${key}: three states required`);
      else {
        if (rows[0]!.glyph || !rows[1]!.glyph || !rows[2]!.glyph || rows[1]!.glyph === rows[2]!.glyph)
          failures.push(`${key}: states need distinct non-color cues`);
        if (rows[0]!.color === rows[1]!.color || rows[0]!.color === rows[2]!.color)
          failures.push(`${key}: placeholders need secondary hierarchy`);
        if (rows[0]!.text !== "Sahara Desert" || !accessible.includes('definition: "Value state: Empty"') || !accessible.includes('definition: "Value state: Unknown"'))
          failures.push(`${key}: accessible value/state distinction missing`);
        if (rows.slice(1).some(row => row.hiddenGlyph !== "true")) failures.push(`${key}: duplicate glyph announcements`);
        if (rows.some(row => row.overflow || !row.inViewport)) failures.push(`${key}: facts must reflow`);
      }
      if (await region.locator('button,a,input,[tabindex],[role="status"],[role="alert"]').count())
        failures.push(`${key}: facts are passive content`);
      await writeFile(resolve(directory, `${key}.json`), JSON.stringify({ rows, accessible }, null, 2) + "\n");
      await region.screenshot({ path: resolve(directory, `${key}.png`) });
    }
    await writeFile(resolve(directory, "failures.json"), JSON.stringify(failures, null, 2) + "\n");
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});
