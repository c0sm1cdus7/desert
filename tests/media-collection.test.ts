import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePublicCatalog } from '../src/public-catalog/compile.ts';
import { publicCatalogSurface } from '../src/public-catalog/surface.ts';
import { requirePublicCatalogCapabilities } from '../src/public-catalog/capabilities.ts';
import { catalogFixture } from './fixtures/public-catalog.ts';

function fixture() {
  const base = catalogFixture();
  return { ...base, featuredMedia: { kind: 'gallery', images: [
    { asset: 'parks.lake', alt: 'A blue lake' }, { asset: 'parks.hill', alt: 'A green hill' },
  ] }, source: { ...base.source, records: base.source.records.map((record, i) =>
    i ? record : { ...record, gallery: ['parks.lake', 'parks.hill'] }) } };
}
test('ordered photo collections survive compilation and require a capable renderer', () => {
  const compiled = compilePublicCatalog(fixture());
  assert.deepEqual(compiled.surface.details[0]?.gallery?.map(p => p.asset), ['parks.lake', 'parks.hill']);
  assert.equal(compiled.surface.featuredMedia?.kind, 'gallery');
  assert.ok(compiled.surface.requirements.features.includes('media.gallery'));
  assert.throws(() => requirePublicCatalogCapabilities({ ...compiled.surface.requirements,
    features: compiled.surface.requirements.features.filter(f => f !== 'media.gallery') }, compiled.surface.requirements), /MISSING_RENDERER_CAPABILITY/);
  assert.equal(compiled.surface.details[0]?.image.asset, 'parks.lake');
});
test('collections reject missing, duplicate and mismatched cover references', () => {
  const good = fixture();
  for (const gallery of [[], ['missing'], ['parks.lake', 'parks.lake'], ['parks.hill']]) {
    assert.throws(() => compilePublicCatalog({ ...good, source: { ...good.source,
      records: good.source.records.map((r,i) => i ? r : { ...r, gallery }) } }), /INVALID/);
  }
  const compiled = compilePublicCatalog(good);
  assert.throws(() => publicCatalogSurface({ ...compiled.surface, details: compiled.surface.details.map((d,i) =>
    i ? d : { ...d, gallery: [{ asset: 'parks.hill', alt: 'wrong cover' }] }) }), /INVALID/);
});
