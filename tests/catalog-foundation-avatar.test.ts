// Avatar: an identity's seeded drawing, a picture with initials, or initials alone, at three sizes; a seed avatar can be
// the button that shuffles its seed. It absorbs SeedAvatar, AvatarShuffle's button and MediaControl's avatar.
import assert from "node:assert/strict";
import test from "node:test";
import { absorbedPiecesBefore } from "./fixtures/absorbed-pieces-before.ts";
import { mountedBefore } from "./support/before.ts";
import { contractShape, specimenFindings } from "./support/foundation.ts";

test("avatar: the contract offers a source, three sizes, a label and the shuffle interaction, nothing else", async () => {
  assert.deepEqual(await contractShape("avatar"), {
    size: ["portrait", "compact", "row"], "label?": "text", interaction: ["none", "shuffle"],
    source: ["object", "object", "object"], "shuffleLabel?": ["undefined", "text"], "disabled?": ["undefined", "boolean"],
  });
});

test("avatar: every size × interaction has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("avatar"), []);
});

const page = `<div data-probe-host style="display:flex;gap:16px;align-items:center">
  <Catalog.Avatar size="portrait" interaction="none" source={{ kind: "seed", seed: "3f9a1c07d2e85b46" }} label="Ada's avatar" />
  <Catalog.Avatar size="compact" interaction="none" source={{ kind: "seed", seed: "3f9a1c07d2e85b46" }} />
  <Catalog.Avatar size="row" interaction="none" source={{ kind: "initials", initials: "AR" }} label="Alex Rivera" />
  <Catalog.Avatar size="row" interaction="none" source={{ kind: "image", source: "/missing.png", initials: "JD" }} />
  <span data-shuffle><Catalog.Avatar size="portrait" interaction="shuffle" source={{ kind: "seed", seed }} shuffleLabel="Shuffle avatar"
    onshuffle={next => { seed = next; shuffles += 1; }} /></span>
  <span data-locked><Catalog.Avatar size="portrait" interaction="shuffle" source={{ kind: "seed", seed: "0011223344556677" }}
    shuffleLabel="Shuffle locked avatar" disabled onshuffle={() => { shuffles += 100; }} /></span>
  <span data-before><Catalog.AvatarShuffle seed="3f9a1c07d2e85b46" /></span>
  <span data-old-seed><Catalog.SeedAvatar seed="3f9a1c07d2e85b46" label="Ada's avatar" /></span>
</div><output data-seed>{seed}</output><output data-shuffles>{shuffles}</output>`;
const script = `  let seed = $state("3f9a1c07d2e85b46"), shuffles = $state(0);`;

test("avatar: sizes, names and drawings; decorative without a label; initials while a picture cannot load", async () => {
  const f = await mountedBefore(absorbedPiecesBefore, page, script);
  try {
    const marks = await f.page.locator('[data-probe-host] > [data-slot="avatar"]').evaluateAll(nodes => nodes.map(node => ({
      size: node.getBoundingClientRect().width, round: parseFloat(getComputedStyle(node).borderRadius) >= node.getBoundingClientRect().width / 2,
      named: node.querySelector('svg[role="img"]')?.getAttribute("aria-label") ?? node.getAttribute("aria-label"),
      hidden: node.getAttribute("aria-hidden") ?? node.querySelector("svg")?.getAttribute("aria-hidden") ?? null,
      seed: node.querySelector("[data-avatar-seed]")?.getAttribute("data-avatar-seed") ?? null, text: node.textContent?.trim() })));
    assert.deepEqual(marks, [
      { size: 90, round: true, named: "Ada's avatar", hidden: null, seed: "3f9a1c07d2e85b46", text: "" },
      { size: 44, round: true, named: null, hidden: "true", seed: "3f9a1c07d2e85b46", text: "" },
      { size: 40, round: true, named: "Alex Rivera", hidden: null, seed: null, text: "AR" },
      { size: 40, round: true, named: null, hidden: "true", seed: null, text: "JD" },
    ]);
    const drawing = (selector: string) => f.page.locator(selector).first().evaluate(node => node.innerHTML.replace(/svelte-[a-z0-9]+/g, "")
      .replace(/id="[^"]*"|url\(#[^)]*\)/g, ""));
    assert.equal(await drawing('[data-probe-host] > [data-slot="avatar"] svg'), await drawing("[data-old-seed] svg"),
      "the seeded drawing is SeedAvatar's, band for band");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("avatar: the shuffle button draws a new seed, keeps the AvatarShuffle pixels, and its overlay is the theme token", async () => {
  const f = await mountedBefore(absorbedPiecesBefore, page, script);
  try {
    const shuffle = f.page.locator("[data-shuffle]").getByRole("button", { name: "Shuffle avatar", exact: true });
    const box = async (selector: string) => f.page.locator(selector).evaluate(node => {
      const style = getComputedStyle(node), rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height, radius: style.borderRadius, background: style.backgroundColor, border: style.borderTopWidth };
    });
    assert.deepEqual(await box("[data-shuffle] button"), await box("[data-before] button"));
    const overlay = f.page.locator("[data-shuffle] [data-avatar-shuffle]");
    assert.equal(await overlay.evaluate(node => getComputedStyle(node).opacity), "0");
    await shuffle.hover();
    assert.deepEqual(await overlay.evaluate(node => ({ opacity: getComputedStyle(node).opacity, ink: getComputedStyle(node).backgroundColor })),
      { opacity: "1", ink: "rgba(16, 22, 33, 0.6)" });
    assert.equal(await overlay.evaluate(node => getComputedStyle(node).getPropertyValue("background-color")),
      await overlay.evaluate(node => { const probe = document.createElement("i"); probe.style.backgroundColor = "var(--avatar-shuffle-overlay)";
        node.append(probe); const value = getComputedStyle(probe).backgroundColor; probe.remove(); return value; }));
    await shuffle.click();
    assert.equal(await f.page.locator("[data-shuffles]").innerText(), "1");
    const next = await f.page.locator("[data-seed]").innerText();
    assert.match(next, /^[a-f0-9]{16}$/);
    assert.notEqual(next, "3f9a1c07d2e85b46");
    assert.equal(await f.page.locator("[data-shuffle] [data-avatar-seed]").getAttribute("data-avatar-seed"), next);
    const locked = f.page.getByRole("button", { name: "Shuffle locked avatar", exact: true });
    assert.equal(await locked.isDisabled(), true);
    await locked.click({ force: true });
    assert.equal(await f.page.locator("[data-shuffles]").innerText(), "1");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
