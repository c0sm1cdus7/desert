import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

// Layout policy, not device detection: the same browser must choose different
// presentations when its actual host or reading-space requirement changes.
test("sidebar docks only when its host fits navigation plus readable content", async () => {
  const f = await svelteBrowser(`<script>
    import * as Sidebar from '@desert/svelte/vendor/components/ui/sidebar/index.js';
    let width = $state(499);
  </script>
  <button onclick={() => width = 500}>Grow host</button>
  <button onclick={() => width = 499}>Shrink host</button>
  <div style:width={width + 'px'}>
    <Sidebar.Provider contentMinWidth="300px" style="--sidebar-width:200px">
      <Sidebar.Trigger />
      <Sidebar.Root><p>Navigation</p></Sidebar.Root>
    </Sidebar.Provider>
  </div>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 1400, height: 900 });
    const layout = f.page.locator('[data-slot="sidebar-wrapper"]');
    await layout.and(f.page.locator('[data-presentation="overlay"]')).waitFor();
    assert.equal(await layout.getAttribute("data-state"), "collapsed", "State describes the actual presentation, not a stored docked preference");
    await f.page.locator('[data-sidebar="trigger"]').click();
    assert.equal(await layout.getAttribute("data-state"), "expanded");
    await f.page.keyboard.press("Escape");
    assert.equal(await layout.getAttribute("data-state"), "collapsed");
    await f.page.getByRole("button", { name: "Grow host" }).click();
    await layout.and(f.page.locator('[data-presentation="docked"]')).waitFor();
    await f.page.getByRole("button", { name: "Shrink host" }).click();
    await layout.and(f.page.locator('[data-presentation="overlay"]')).waitFor();
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("sidebar fit accounts for larger text without changing the viewport", async () => {
  const f = await svelteBrowser(`<script>
    import * as Sidebar from '@desert/svelte/vendor/components/ui/sidebar/index.js';
  </script>
  <div style="width:600px">
    <Sidebar.Provider contentMinWidth="20rem" style="--sidebar-width:10rem">
      <Sidebar.Root><p>Navigation</p></Sidebar.Root>
    </Sidebar.Provider>
  </div>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const layout = f.page.locator('[data-slot="sidebar-wrapper"]');
    await layout.and(f.page.locator('[data-presentation="docked"]')).waitFor();
    await f.page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
    await layout.and(f.page.locator('[data-presentation="overlay"]')).waitFor();
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("sidebar reserves host padding before fitting navigation and reading space", async () => {
  const f = await svelteBrowser(`<script>
    import * as Sidebar from '@desert/svelte/vendor/components/ui/sidebar/index.js';
    let width = $state(500);
  </script>
  <button onclick={() => width = 540}>Make room for padding</button>
  <div style:width={width + 'px'}>
    <Sidebar.Provider contentMinWidth="300px" style="--sidebar-width:200px;padding-inline:20px">
      <Sidebar.Root><p>Navigation</p></Sidebar.Root>
    </Sidebar.Provider>
  </div>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const layout = f.page.locator('[data-slot="sidebar-wrapper"]');
    await f.page.waitForFunction(() => {
      const host = document.querySelector('[data-slot="sidebar-wrapper"]');
      return host && getComputedStyle(host).paddingLeft === "20px";
    });
    await f.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await layout.getAttribute("data-presentation"), "overlay",
      "500px outer width leaves only 460px for the 500px navigation-and-content budget");
    await f.page.getByRole("button", { name: "Make room for padding" }).click();
    await layout.and(f.page.locator('[data-presentation="docked"]')).waitFor();
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
