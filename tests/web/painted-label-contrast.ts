import assert from 'node:assert/strict';
import type { Locator, Page } from 'playwright';

/** Measure the actual backdrop under a label, including media and glass.
 * Only glyph visibility changes for the background sample; material, position,
 * interactions and scene remain painted by the browser, not approximated CSS. */
export async function paintedLabelContrast(page: Page, control: Locator, label = control.locator('[data-button-content]')) {
  const rect = await label.boundingBox();
  assert.ok(rect && rect.width > 4 && rect.height > 4, 'Visible label region required');
  const style = await control.evaluate(element => {
    const s = getComputedStyle(element);
    for (let node: Element | null = element; node; node = node.parentElement) {
      assertUnattenuated(getComputedStyle(node));
    }
    function assertUnattenuated(style: CSSStyleDeclaration) {
      if (Number(style.opacity) !== 1 || style.filter !== 'none' || style.mixBlendMode !== 'normal')
        throw new Error('Foreground attenuation needs a separate text-paint measurement');
    }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = s.color; ctx.fillRect(0, 0, 1, 1);
    return { foreground: s.color, rgba: [...ctx.getImageData(0, 0, 1, 1).data],
      background: s.backgroundColor, backgroundImage: s.backgroundImage,
      opacity: Number(s.opacity), size: parseFloat(s.fontSize), weight: Number(s.fontWeight) };
  });
  assert.equal(style.rgba[3], 255, 'Opaque label foreground required');
  const previousVisibility = await label.evaluate(e => {
    const value = e.style.getPropertyValue('visibility'), priority = e.style.getPropertyPriority('visibility');
    e.style.setProperty('visibility', 'hidden', 'important'); return { value, priority };
  });
  let screenshot: Buffer;
  try { screenshot = await page.screenshot(); }
  finally { await label.evaluate((e, old) => {
    if (old.value) e.style.setProperty('visibility', old.value, old.priority);
    else e.style.removeProperty('visibility');
  }, previousVisibility); }
  const paint = await page.evaluate(async ({ encoded, rect, foreground }) => {
    const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data, density = canvas.width / innerWidth;
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map(v => {
      v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i]!, 0);
    const a = luminance(foreground); let ratio = Infinity, samples = 0, compositedBackground = [0, 0, 0];
    for (let y = Math.max(0, Math.ceil((rect.y + 2) * density)); y < Math.min(canvas.height, (rect.y + rect.height - 2) * density); y++) {
      for (let x = Math.max(0, Math.ceil((rect.x + 2) * density)); x < Math.min(canvas.width, (rect.x + rect.width - 2) * density); x++) {
        const i = (y * canvas.width + x) * 4, rgb = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!], b = luminance(rgb);
        const current = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        if (current < ratio) { ratio = current; compositedBackground = rgb; } samples++;
      }
    }
    return { ratio, samples, compositedBackground };
  }, { encoded: screenshot.toString('base64'), rect, foreground: style.rgba });
  assert.ok(paint.samples > 0 && Number.isFinite(paint.ratio), 'Painted label region must be on screen');
  return { ...style, ...paint, foregroundAlpha: style.rgba[3], backgroundAlpha: 255,
    method: 'minimum contrast across actual composited label-region pixels' };
}
