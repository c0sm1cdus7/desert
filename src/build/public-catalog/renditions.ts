import sharp from 'sharp';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash } from '../files.ts';
import type { BoundCatalogAsset } from './assets.ts';
import { renditionWidths, imageInputPixelLimit } from '../../media/rendition-policy.ts';
export { renditionWidths } from '../../media/rendition-policy.ts';

const recipe = `webp-q82-alpha100-effort4-srgb-auto-orient-v1-${sharp.versions.sharp}-${sharp.versions.vips}`;
const cache = join(tmpdir(), 'desert-media-renditions-v1');
export type Rendition = { bytes: Buffer; size: number; mediaType: string; digest: string };

/** Decode at build/host preparation, not while handling display requests. Originals are immutable. */
export async function createRendition(bytes: Buffer, edge: number): Promise<Buffer> {
  if (!(renditionWidths as readonly number[]).includes(edge)) throw new Error('INVALID_MEDIA_RENDITION_SIZE');
  return sharp(bytes, { limitInputPixels: imageInputPixelLimit }).autoOrient()
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
    .withIccProfile('srgb').webp({ quality: 82, alphaQuality: 100, effort: 4 }).toBuffer();
}

export async function prepareRenditions(assets: readonly BoundCatalogAsset[]) {
  await mkdir(cache, { recursive: true });
  const result = new Map<string, Rendition>();
  // Two sources at a time; each source's variants are generated serially.
  const queue = assets.filter(asset => asset.mediaType.startsWith('image/'));
  async function worker() {
    for (let asset = queue.shift(); asset; asset = queue.shift()) {
      const original = await readFile(asset.file);
      if (hash(original) !== asset.digest) throw new Error('CATALOG_MEDIA_CHANGED');
      for (const edge of renditionWidths) {
        const key = hash(Buffer.from(`${asset.digest}-${recipe}-${edge}`));
        const file = join(cache, `${key}.webp`);
        let bytes: Buffer;
        try {
          bytes = await readFile(file);
          const expected = await readFile(`${file}.sha256`, 'utf8');
          if (hash(bytes) !== expected) throw new Error('MEDIA_CACHE_MISMATCH');
        } catch {
          bytes = await createRendition(original, edge);
          const pending = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
          await writeFile(pending, bytes); await rename(pending, file);
          await writeFile(`${file}.sha256`, hash(bytes));
        }
        result.set(`${asset.id}:${edge}`, { bytes, size: bytes.length, mediaType: 'image/webp', digest: hash(bytes) });
      }
    }
  }
  await Promise.all([worker(), worker()]);
  return result;
}
