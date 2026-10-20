import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";
import { paint } from "./scroll-edge-fixture.ts";

// Independent appearance probe, not a product fixture or an Apple specification.
// Earlier glass-transmission acceptance is superseded and its v23/v24 artifacts
// remain preserved. Current top-edge acceptance uses shallow masked blur plus
// progressive shading; the owner-approved bottom shading remains unchanged.
export async function captureMaterialProbe() {
  const directory = process.env.DESERT_MATERIAL_EVIDENCE
    ?? `artifacts/scroll-edge/material-${basename(process.env.DESERT_CATALOG_BUILD ?? "catalog")}`;
  await mkdir(directory, { recursive: true });
  const f = await publicCatalogFixture();
  const states: { name: string; reducedTransparency: boolean; increasedContrast: boolean; layers: { blur: string; filter: string; mask: string }[] }[] = [];
  try {
    const { page, context } = f;
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    const cdp = await context.newCDPSession(page);
    const scope = page.locator("[data-catalog-content]"), viewport = scope.locator("[data-catalog-scroll]");
    async function media(reduced: boolean, contrast = false) {
      await cdp.send("Emulation.setEmulatedMedia", { features: [
        { name: "prefers-reduced-transparency", value: reduced ? "reduce" : "no-preference" },
        { name: "prefers-contrast", value: contrast ? "more" : "no-preference" },
      ] });
      await paint(page);
    }
    async function record(name: string, clip?: { x: number; y: number; width: number; height: number }) {
      const state = await scope.evaluate(node => {
        const edge = node.querySelector<HTMLElement>("[data-scroll-edge]")!;
        return { reducedTransparency: matchMedia("(prefers-reduced-transparency:reduce)").matches,
          increasedContrast: matchMedia("(prefers-contrast:more)").matches,
          scroll: node.querySelector("[data-catalog-scroll]")!.scrollTop,
          edge: edge.getBoundingClientRect().toJSON(), core: getComputedStyle(edge).getPropertyValue("--edge-core"),
          background: getComputedStyle(edge, "::after").backgroundImage,
        layers: [edge, ...edge.children].flatMap(layer => [null,'::before','::after'].map(pseudo => ({
          blur: getComputedStyle(layer,pseudo).backdropFilter,
          filter: getComputedStyle(layer,pseudo).filter, mask: getComputedStyle(layer,pseudo).maskImage }))) };
      });
      states.push({ name, ...state });
      const pixels = await page.screenshot({ path: `${directory}/${name}.png`, animations: "disabled", ...(clip ? { clip } : {}) });
      await writeFile(`${directory}/${name}.json`, JSON.stringify(state, null, 2) + "\n");
      return pixels;
    }
    await (await navigationAction(page, "Landmarks")).click(); await settle(page);
  await media(false); await record("landmarks-start-normal");
  await viewport.evaluate(node => { node.scrollTop = 64; }); await paint(page);
  await record("landmarks-near-start-normal");
    await viewport.evaluate(node => { node.scrollTop = 160; }); await paint(page);
    await media(false); await record("landmarks-normal");
    await media(true); await record("landmarks-reduced");
    await (await navigationAction(page, "Travel kit")).click(); await settle(page);
    await viewport.evaluate(node => { node.scrollTop = 230; }); await paint(page);
    await media(false); await record("travel-normal");
    await media(true); await record("travel-reduced");
    await (await navigationAction(page, "Landmarks")).click(); await settle(page);
    await viewport.evaluate(node => {
      node.scrollTop = 160;
      const probe = document.createElement("div");
      Object.assign(probe.style, { position: "absolute", top: `${node.scrollTop}px`, left: "32px",
        width: "480px", height: "180px", display: "flex", pointerEvents: "none" });
      for (const background of ["rgb(240,60,100)", "rgb(50,200,230)",
        "repeating-linear-gradient(to right,#fff 0 4px,#000 4px 8px)"]) {
        const patch = document.createElement("div");
        Object.assign(patch.style, { width: "160px", height: "180px", flexShrink: "0", background });
        probe.append(patch);
      }
      probe.setAttribute("data-material-probe", "true"); node.append(probe);
    });
    await paint(page);
    const bounds = (await scope.boundingBox())!;
    const clip = { x: bounds.x + 32, y: bounds.y, width: 480, height: 140 };
    await media(false); const normal = await record("probe-normal", clip);
    await media(true); const reduced = await record("probe-reduced", clip);
    await media(false, true); const contrast = await record("probe-contrast", clip);
    await scope.locator("[data-scroll-edges]").evaluate(node => { node.style.display = "none"; });
    await paint(page); const bare = await record("probe-bare", clip);
    const decoder = await context.newPage();
    const measurements = [];
    for (const [name, png] of [["bare", bare], ["normal", normal], ["reduced", reduced], ["contrast", contrast]] as const) {
      measurements.push(await decoder.evaluate(async ({ name, data }) => {
        const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(data), character => character.charCodeAt(0))]));
        const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d")!; ctx.drawImage(bitmap, 0, 0);
        const scale = bitmap.width / 480;
        function pixel(x: number, y: number) { return [...ctx.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data].slice(0, 3); }
        return { name, rows: [12, 28, 48, 64, 76, 84, 110].map(y => {
          const red = pixel(80, y), cyan = pixel(240, y);
          const colorDistance = Math.hypot(...red.map((channel, index) => channel - cyan[index]!));
          let fineVariation = 0;
          for (let x = 352; x < 448; x++) fineVariation += Math.abs(pixel(x + 1, y)[0]! - pixel(x, y)[0]!);
          return { y, red, cyan, colorDistance, fineVariation: fineVariation / 96 };
        }) };
      }, { name, data: png.toString("base64") }));
    }
    const control = measurements.find(value => value.name === "bare")!;
    const report = measurements.map(value => ({ ...value, rows: value.rows.map((row, index) => ({ ...row,
      transmittedColor: row.colorDistance / control.rows[index]!.colorDistance,
      retainedFineVariation: row.fineVariation / control.rows[index]!.fineVariation })) }));
    await writeFile(`${directory}/transmission.json`, JSON.stringify(report, null, 2) + "\n");
    return { report, states, directory };
  } finally { await f.close(); }
}
