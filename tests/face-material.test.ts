// Laws 9e and 9d, measured on the bank's own specimens. FACE = ONE primitive: every face (Face, a row's face, an avatar,
// an audio or video artwork placeholder) has the same card-white ground and the same hairline, a rounded square at every size (a circle
// only for a person), and its tone paints only the glyph. One curvature family: a tag chip is never a capsule, and its
// remove button's corner is concentric with it (the chip's radius less the inset between their outer edges, as a field's
// accessory is inside its well), never a circle.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { contractShape } from "./support/foundation.ts";

test("face: the contract carries a face and its size, nothing that could paint it", async () => {
  assert.deepEqual(Object.keys(await contractShape("face")).sort(), ["compact?", "face"]);
});

const photo = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Cpath fill="%238e6352" d="M0 0h40v40H0z"/%3E%3C/svg%3E';
const page = `<script lang="ts">
  import * as Catalog from "@desert/svelte/catalog/index.ts";
  import { FaceSpecimens } from "@desert/svelte/catalog/foundations/face/face.specimens.ts";
  import { RowSpecimens } from "@desert/svelte/catalog/foundations/row/row.specimens.ts";
  import { AvatarSpecimens } from "@desert/svelte/catalog/foundations/avatar/avatar.specimens.ts";
  import { ImageSpecimens } from "@desert/svelte/catalog/foundations/image/image.specimens.ts";
  import { TagSpecimens } from "@desert/svelte/catalog/foundations/tag/tag.specimens.ts";
  const photo = ${JSON.stringify(photo)};
  // Every specimen that draws a face or a chip; a picture the probe cannot serve is drawn from a data URI instead.
  const rows = RowSpecimens.filter(specimen => specimen.props.leading?.kind !== "image");
  const avatars = AvatarSpecimens.map(specimen => specimen.props.source.kind === "image"
    ? { ...specimen, props: { ...specimen.props, source: { ...specimen.props.source, source: photo } } } : specimen);
  const placeholders = ImageSpecimens.filter(specimen => "placeholder" in specimen.props);
  const chips = TagSpecimens.filter(specimen => specimen.props.presentation === "chip");
</script><main style="padding:24px;background:var(--card)">
  <section data-faces style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
    {#each FaceSpecimens as specimen}<Catalog.Face {...specimen.props} />{/each}
    {#each avatars as specimen}<Catalog.Avatar {...specimen.props} />{/each}
    {#each placeholders as specimen}<div style="width:80px;height:60px;border-radius:14px;overflow:hidden"><Catalog.Image {...specimen.props} frame="host" /></div>{/each}
  </section>
  <section style="width:360px">{#each rows as specimen}<Catalog.Row {...specimen.props} />{/each}</section>
  <section data-tags style="display:flex;gap:8px;flex-wrap:wrap">{#each chips as specimen}<Catalog.Tag {...specimen.props} />{/each}</section>
</main>`;

test("face and tag: every specimen face shares one ground, one hairline and its radius; tone reaches only the glyph; no capsule chip", { timeout: 90000 }, async () => {
  const f = await svelteBrowser(page);
  const directory = new URL(`../artifacts/face-material/${process.env.FACE_EVIDENCE ?? "current"}/`, import.meta.url);
  const failures: string[] = [];
  try {
    await mkdir(directory, { recursive: true });
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 640, height: 900 });
    await f.page.locator('[data-slot="avatar"] img').first().waitFor();
    for (const colorScheme of ["light", "dark"] as const) for (const contrast of ["no-preference", "more"] as const) {
      await f.page.emulateMedia({ colorScheme, contrast, reducedMotion: "reduce" });
      const observed = await f.page.evaluate(() => {
        const token = (value: string, property: "backgroundColor" | "color") => {
          const probe = document.createElement("i"); probe.style[property] = value; document.body.append(probe);
          const read = getComputedStyle(probe)[property]; probe.remove(); return read;
        };
        const faces = [...document.querySelectorAll('[data-piece="face"], [data-slot="avatar"], [data-image-placeholder]')].map(face => {
          const style = getComputedStyle(face), hairline = getComputedStyle(face, "::after"), box = face.getBoundingClientRect();
          const content = face.querySelector("[data-face-content]");
          return { kind: face.getAttribute("data-face-kind") ?? face.getAttribute("data-slot") ?? "placeholder",
            person: face.getAttribute("data-shape") === "person", tone: face.getAttribute("data-tone"),
            width: Math.round(box.width), height: Math.round(box.height), ground: style.backgroundColor, radius: style.borderRadius,
            parentRadius: getComputedStyle(face.parentElement!).borderRadius,
            hairline: { width: hairline.borderTopWidth, style: hairline.borderTopStyle, color: hairline.borderTopColor, content: hairline.content,
              blend: hairline.mixBlendMode, pointer: hairline.pointerEvents, radius: hairline.borderRadius },
            glyph: content ? getComputedStyle(content).color : null, text: face.textContent?.trim() ?? "" };
        });
        const chips = [...document.querySelectorAll("[data-tags] [data-slot=badge]")].map(chip => {
          const box = chip.getBoundingClientRect(), remove = chip.querySelector("button");
          const removeBox = remove?.getBoundingClientRect();
          return { radius: parseFloat(getComputedStyle(chip).borderRadius), height: box.height, right: box.right,
            remove: remove && removeBox ? { radius: parseFloat(getComputedStyle(remove).borderRadius), height: removeBox.height,
              inset: box.right - removeBox.right } : null };
        });
        return { faces, chips, ground: token("var(--card-base)", "backgroundColor"),
          border: token("var(--border)", "backgroundColor"), foreground: token("var(--foreground)", "color"),
          ink: { neutral: token("var(--muted-foreground)", "color"), warning: token("var(--warning)", "color"), error: token("var(--destructive)", "color") } };
      });
      const check = (valid: boolean, message: string) => { if (!valid) failures.push(`${colorScheme}/${contrast}: ${message}`); };
      const hairline = contrast === "more" ? observed.foreground : observed.border;
      // The faces, avatars, the audio and video placeholders (unavailable media is no face but the one notice of unavailable
      // media, fourth review: tests/media-notice-anatomy.test.ts) and the rows' faces.
      check(observed.faces.length >= 7 + 6 + 2 + 4, `every face specimen is measured (${observed.faces.length})`);
      for (const [index, face] of observed.faces.entries()) {
        const name = `${index} ${face.kind}${face.tone ? `/${face.tone}` : ""}`;
        check(face.ground === observed.ground, `${name}: ground ${face.ground} is the card white ${observed.ground}`);
        check(face.hairline.width === "1px" && face.hairline.style === "solid" && face.hairline.content !== "none"
          && face.hairline.blend === "normal" && face.hairline.pointer === "none", `${name}: the one unblended 1px hairline`);
        check(face.hairline.color === hairline, `${name}: hairline ${face.hairline.color} is the border token ${hairline}`);
        check(face.hairline.radius === face.radius, `${name}: the hairline follows the face's corner`);
        check(!face.text || ["symbol", "flag", "placeholder"].includes(face.kind), `${name}: a face never spells "${face.text}"`);
        if (face.kind === "placeholder") check(face.radius === face.parentRadius, `${name}: a placeholder takes its frame's corner`);
        else if (face.person) check(parseFloat(face.radius) >= face.width / 2, `${name}: a person is a circle`);
        else {
          check(face.width === face.height, `${name}: a square`);
          check(face.radius === "30%", `${name}: the rounded square's corner (30% at every size), not ${face.radius}`);
        }
        if (face.glyph !== null) check(face.glyph === observed.ink[(face.tone ?? "neutral") as "neutral" | "warning" | "error"],
          `${name}: the glyph wears its tone's ink`);
      }
      check(new Set(observed.chips.map(chip => chip.radius)).size === 1, `one chip radius (${[...new Set(observed.chips.map(chip => chip.radius))]})`);
      for (const [index, chip] of observed.chips.entries()) {
        check(chip.radius < chip.height / 2 - 2, `chip ${index}: radius ${chip.radius} on ${chip.height}px is a capsule`);
        if (!chip.remove) continue;
        check(Math.abs(chip.remove.radius - (chip.radius - chip.remove.inset)) < .5,
          `chip ${index}: remove corner ${chip.remove.radius} is not concentric (${chip.radius} - ${chip.remove.inset})`);
        check(chip.remove.radius < chip.remove.height / 2 - 2, `chip ${index}: the remove button is a circle`);
      }
      await writeFile(new URL(`${colorScheme}-${contrast}.json`, directory), JSON.stringify({ observed, failures }, null, 2));
      await f.page.screenshot({ path: new URL(`${colorScheme}-${contrast}.png`, directory).pathname, fullPage: true });
    }
    assert.deepEqual(f.errors, []);
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});
