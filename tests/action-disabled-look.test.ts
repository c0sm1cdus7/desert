// One disabled look for Action (second review of the slice 3 package): the disabled «Continue» of the access form was a
// pale blue label on the primary blue, hard to read and still reading as the primary. Every unavailable action, whatever
// its emphasis, draws the same pane and the same faded label, plainly unlike a ready primary, and its label keeps at least
// 3:1 against its ground, in both themes.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

const actions = (["primary", "secondary", "destructive"] as const).map(emphasis => `<div data-emphasis-case="${emphasis}" style="display:inline-block;padding:8px">
  <Catalog.Action label="Continue" icon="confirm" emphasis="${emphasis}" face="text" type="button" state="unavailable" /></div>`).join("");

function contrast(a: readonly number[], b: readonly number[]) {
  const luminance = (pixel: readonly number[]) => {
    const [r, g, bl] = pixel.map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
    return .2126 * r! + .7152 * g! + .0722 * bl!;
  };
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + .05) / (y! + .05);
}

test("every unavailable action has the one disabled look, its label at least 3:1 against its ground", async () => {
  const f = await mounted(`<main style="padding:16px;background:var(--background)">${actions}
    <div data-ready style="display:inline-block;padding:8px"><Catalog.Action label="Continue" icon="confirm" emphasis="primary" face="text" type="button" state="ready" /></div></main>`);
  try {
    for (const scheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await f.page.waitForTimeout(150);
      const looks = await f.page.evaluate(() => [...document.querySelectorAll("[data-emphasis-case] button, [data-ready] button")].map(button => {
        const style = getComputedStyle(button), label = button.querySelector("[data-button-label]")!, content = button.querySelector("[data-button-content]") ?? label;
        return { ground: style.backgroundColor, border: style.borderTopColor, ink: getComputedStyle(label).color, weight: getComputedStyle(label).fontWeight,
          opacity: getComputedStyle(content).opacity };
      }));
      const ready = looks.pop()!;
      assert.deepEqual(looks.slice(1), [looks[0], looks[0]], `${scheme}: one disabled look for every emphasis`);
      assert.notEqual(looks[0]!.ground, ready.ground, `${scheme}: a disabled action is not drawn on the primary's ground`);
      for (const emphasis of ["primary", "secondary", "destructive"]) {
        const button = f.page.locator(`[data-emphasis-case="${emphasis}"] button`);
        const box = (await button.boundingBox())!;
        const png = await f.page.screenshot({ clip: box });
        const ratio = await f.page.evaluate(async (data: string) => {
          const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
          const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, image.width, image.height).data;
          const at = (x: number, y: number) => [...pixels.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 3)];
          return { ground: at(6, Math.floor(image.height / 2)), all: Array.from({ length: image.width * image.height }, (_, index) => at(index % image.width, Math.floor(index / image.width))) };
        }, png.toString("base64"));
        const best = Math.max(...ratio.all.map(pixel => contrast(pixel, ratio.ground)));
        assert.ok(best >= 3, `${scheme} · ${emphasis}: the disabled label reaches only ${best.toFixed(2)}:1 against its ground`);
      }
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
