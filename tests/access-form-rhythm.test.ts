// The access form's header keeps 79d8322's rhythm (second review of the slice 3 package, design §7.12: a spacing change
// the owner did not list is a regression): the step caption, the avatar, the headline and its intro stood .5rem apart,
// and the headline kept .75rem more air above it (its old top margin), 20px from the avatar; the slice had dropped that
// margin. The headline's type role (display) is item 3 and is not compared here.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

test("access form: caption, avatar, headline and intro keep their 79d8322 gaps", async () => {
  const f = await mounted(`<div style="width:390px" data-host><AccessForm mode="initialize" onsubmit={async () => {}} /></div>`,
    `  import AccessForm from "@desert/svelte/catalog/compositions/access-form/AccessForm.svelte";`);
  try {
    for (const width of [390, 1280]) {
      await f.page.setViewportSize({ width, height: 900 });
      const gaps = await f.page.evaluate(() => {
        const host = document.querySelector("[data-host]")!;
        const box = (element: Element | null | undefined) => element!.getBoundingClientRect();
        const caption = [...host.querySelectorAll("*")].find(element => element.childElementCount === 0 && element.textContent?.startsWith("Identity ·"));
        const avatar = host.querySelector('[data-slot="avatar"], .shuffle')?.closest("button") ?? host.querySelector('[data-slot="avatar"]');
        const heading = host.querySelector("h1, h2"), intro = heading?.nextElementSibling;
        return { captionToAvatar: Math.round(box(avatar).top - box(caption).bottom), avatarToHeading: Math.round(box(heading).top - box(avatar).bottom),
          headingToIntro: Math.round(box(intro).top - box(heading).bottom) };
      });
      assert.deepEqual(gaps, { captionToAvatar: 8, avatarToHeading: 20, headingToIntro: 8 }, `${width}px`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
