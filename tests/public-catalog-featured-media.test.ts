import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePublicCatalog } from '../src/public-catalog/index.ts';
import { catalogFixture } from './fixtures/public-catalog.ts';

test('featured header media is typed, portable and reference-checked', () => {
  const definition = catalogFixture();
  const asset = definition.source.assets[0]!.id;
  for (const featuredMedia of [{ kind: 'image', asset, alt: 'A lake' }, { kind: 'video', asset, alt: 'Silent lake scenery', poster: asset }]) {
    assert.deepEqual(compilePublicCatalog({ ...definition, featuredMedia }).surface.featuredMedia, featuredMedia);
    assert.throws(() => compilePublicCatalog({ ...definition, featuredMedia: { ...featuredMedia, asset: 'missing' } }), /FEATURED_MEDIA_REFERENCE/);
  }
  assert.throws(() => compilePublicCatalog({ ...definition, featuredMedia: { kind: 'iframe', asset, alt: 'Bad' } }), /INVALID_PUBLIC_CATALOG_DEFINITION/);
});
