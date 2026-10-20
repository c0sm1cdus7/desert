import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createRendition } from '../src/build/public-catalog/renditions.ts';

test('public derivatives preserve orientation and alpha, strip private metadata, and never upscale', async () => {
  const original = await sharp({ create: { width: 600, height: 300, channels: 4, background: '#2468ac80' } })
    .png().withMetadata({ orientation: 6 }).toBuffer();
  const before = Buffer.from(original);
  const small = await createRendition(original, 160);
  const metadata = await sharp(small).metadata();
  assert.equal(metadata.width, 80); assert.equal(metadata.height, 160);
  assert.equal(metadata.hasAlpha, true); assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined); assert.equal(metadata.format, 'webp');
  const large = await sharp(await createRendition(original, 1280)).metadata();
  assert.equal(large.width, 300); assert.equal(large.height, 600);
  assert.deepEqual(original, before);
  assert.deepEqual(await createRendition(original, 160), small);
});
