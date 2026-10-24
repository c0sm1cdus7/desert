// Files (design §1.3): the host travels by context, never as a prop; the browser's chooser supplies files, the host
// checks them against the limits, and the control reports files.choose, files.remove and every rejection.
import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

const node = `{version:'desert.control/1',kind:'files',id:'attachments',label:'Attachments',disabled:false,files:[],
  limits:{maxCount:2,maxFileBytes:1024,maxTotalBytes:2048,accept:['image/png']}}`;

test("files chooses through the native chooser, reports rejections and removes a chosen file", async () => {
  const f = await svelteBrowser(`<script>
    import Files from '@desert/svelte/catalog/foundations/files/Files.svelte';
    import { provideFileHost } from '@desert/svelte/infra/file-host-context.ts';
    import { applyControlEvent } from '@desert/interaction/control-nodes.ts';
    provideFileHost();
    let node = $state(${node}), events = $state([]);
  </script><Files {node} onevent={event => { events = [...events, event.kind]; node = applyControlEvent(node, event).node; }} />
  <output>{events.join(',')}</output>`, {}, "https://files.test/");
  try {
    const { page } = f;
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose files", exact: true }).click();
    await (await chooser).setFiles([
      { name: "map.png", mimeType: "image/png", buffer: Buffer.alloc(200) },
      { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") },
    ]);
    await page.getByRole("status").filter({ hasText: "notes.txt: File type is not accepted." }).waitFor();
    await page.getByRole("list", { name: "Selected local files", exact: true }).getByText("map.png · 200 B").waitFor();
    assert.equal(await page.locator("output").textContent(), "files.choose");
    assert.equal(await page.getByRole("group", { name: "Attachments", exact: true }).getAttribute("data-invalid"), "true");
    await page.getByRole("button", { name: "Remove map.png", exact: true }).click();
    await page.getByText("No local files selected.").waitFor();
    assert.equal(await page.locator("output").textContent(), "files.choose,files.remove");
    assert.equal(await page.locator('input[type="file"]').count(), 0, "the chooser host is released");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("files without a provided host fails loudly instead of choosing nowhere", async () => {
  const f = await svelteBrowser(`<script>
    import Files from '@desert/svelte/catalog/foundations/files/Files.svelte';
    const node = ${node};
  </script><Files {node} />`);
  try {
    await f.page.waitForTimeout(200);
    assert.ok(f.errors.some(error => error.includes("LOCAL_FILE_HOST_REQUIRED")), f.errors.join("; "));
  } finally { await f.close(); }
});
