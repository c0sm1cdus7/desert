// The Color bullet page shows a color bullet, as at 79d8322 (second review of the slice 3 package, design §7.12): the
// slice replaced its example by a reference tag («● VOID»), a change the owner did not list and no law asks for.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

test("the Color bullet page's example is one color bullet, without a label beside it", async () => {
  const f = await mounted(`<div data-host><ReferenceSpecimen owner="ColorBullet" /></div>`,
    `  import ReferenceSpecimen from "@desert/svelte/catalog/compositions/reference-specimen/ReferenceSpecimen.svelte";`);
  try {
    const shown = await f.page.locator("[data-host]").evaluate(host => ({ text: (host as HTMLElement).innerText.trim(),
      bullets: host.querySelectorAll(".color-bullet").length, tags: host.querySelectorAll('[data-slot="badge"], [data-tag]').length }));
    assert.deepEqual(shown, { text: "", bullets: 1, tags: 0 });
    // and its contract names the piece it shows: the color bullet, not the tag.
    const { sharedOwnerPieces } = await import("../src/svelte/infra/shared-owners.ts");
    assert.equal(sharedOwnerPieces.ColorBullet, "color-bullet");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
