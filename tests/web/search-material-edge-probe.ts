import { writeFile } from "node:fs/promises";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { enterSearch, openDestination, setSearchPreferences } from "./public-search-mode-helpers.ts";
import { settle } from "./public-catalog-expectations.ts";

// Read-only runtime diagnostic. Probes are inserted only in the ephemeral
// retained page; no production fixture, data or renderer source is modified.
export async function searchMaterialEdgeProbe() {
  const f = await publicCatalogFixture();
  const report = [];
  try {
    const { page } = f;
    await setSearchPreferences(page, false); await openDestination(page, "Landmarks"); await enterSearch(page);
    const viewport = page.locator("[data-catalog-scroll]"), material = page.locator("[data-catalog-search-material]");
    await viewport.evaluate(element => {
      const box = element.getBoundingClientRect();
      for (const [name, style] of [
        ["right", { right: "0", top: "90px", width: "160px", height: "300px", background: "repeating-linear-gradient(to bottom,#fff 0 4px,#000 4px 8px)" }],
        ["bottom", { left: "30px", top: `${box.height - 120}px`, width: "240px", height: "120px", background: "repeating-linear-gradient(to right,#fff 0 4px,#000 4px 8px)" }],
      ] as const) {
        const probe = document.createElement("div"); probe.dataset.searchEdgeProbe = name;
        Object.assign(probe.style, { position: "absolute", zIndex: "999", pointerEvents: "none", ...style }); element.append(probe);
      }
    });
    await settle(page);
    const shots: [string, Buffer][] = [];
    const variants = [
      { name: "normal", workspace: "", material: "" },
      { name: "unfiltered", workspace: "", material: "backdrop-filter:none" },
      { name: "isolation", workspace: "isolation:isolate", material: "" },
      { name: "overflow-hidden", workspace: "overflow:hidden", material: "" },
      { name: "overflow-visible", workspace: "overflow:visible", material: "" },
      { name: "root-filter", workspace: "filter:opacity(1)", material: "" },
      { name: "layer-transform", workspace: "", material: "transform:translateZ(0)" },
      { name: "layer-fixed", workspace: "", material: "position:fixed" },
    ];
    for (const variant of variants) {
      const { name } = variant;
      await page.locator("[data-catalog-workspace]").evaluate((element, style) => (element as HTMLElement).style.cssText = style, variant.workspace);
      await material.evaluate((element, style) => (element as HTMLElement).style.cssText = style, variant.material);
      shots.push([name, await page.screenshot({ path: `artifacts/public-catalog-benchmark/search-edge-probe-v26-${name}.png`, caret: "hide" })]);
    }
    const geometry = await viewport.boundingBox();
    const decoder = await f.context.newPage();
    for (const [name, shot] of shots) {
      report.push(await decoder.evaluate(async ({ name, data, geometry }) => {
        const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))]));
        const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d")!; ctx.drawImage(bitmap, 0, 0);
        const scale = bitmap.width / 1100;
        const pixel = (x: number, y: number) => ctx.getImageData(Math.floor(x * scale), Math.floor(y * scale), 1, 1).data[0]!;
        return { name, geometry, edgeVariation: [0.5, 2, 4, 8, 16, 24, 40, 80].map(distance => {
          let right = 0, bottom = 0;
          for (let offset = 0; offset < 80; offset++) {
            right += Math.abs(pixel(1100 - distance, 160 + offset) - pixel(1100 - distance, 161 + offset));
            bottom += Math.abs(pixel(geometry!.x + 90 + offset, 740 - distance) - pixel(geometry!.x + 91 + offset, 740 - distance));
          }
          return { distance, right: right / 80, bottom: bottom / 80 };
        }) };
      }, { name, data: shot.toString("base64"), geometry }));
    }
    await writeFile("artifacts/public-catalog-benchmark/search-edge-probe-v26.json", JSON.stringify(report, null, 2) + "\n");
    return report;
  } finally { await f.close(); }
}

if (import.meta.main) console.log(JSON.stringify(await searchMaterialEdgeProbe(), null, 2));
