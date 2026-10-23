import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { InteractionCatalog, requireCatalog } from '../src/interaction/catalog.ts';

test('bank ownership and coverage are canonical, versioned and independently resolvable', () => {
  assert.equal(InteractionCatalog.version, '0.5.0', 'Canonical taxonomy and connection fixtures carry an explicit catalog revision');
  const catalog = InteractionCatalog as any;
  assert.deepEqual(catalog.groups.map((group: any) => group.title), ['Foundations', 'Compositions']);
  assert.ok(catalog.foundations.length >= 5);
  const owners = new Set(catalog.foundations.map((owner: any) => owner.id));
  for (const owner of catalog.foundations) {
    assert.ok(owner.sources.length, owner.id);
    for (const source of owner.sources) assert.ok(existsSync(source), `${owner.id}: unresolved source ${source}`);
  }
  assert.equal(new Set(catalog.entries.map((entry: any) => entry.id)).size, catalog.entries.length, 'Canonical semantic IDs are unique');
  for (const entry of catalog.entries) {
    assert.ok(catalog.groups.some((group: any) => group.id === entry.inspection.group));
    assert.ok(entry.inspection.owners.length);
    for (const owner of entry.inspection.owners) assert.ok(owners.has(owner), `${entry.id}: unknown owner ${owner}`);
    assert.deepEqual(entry.inspection.fixtures.map((fixture: any) => fixture.state), entry.states);
    for (const fixture of entry.inspection.fixtures) assert.equal(fixture.id, `${entry.id}:${fixture.state}`);
    assert.ok(entry.inspection.assertions.length, `${entry.id}: behavior must be explicit`);
    for (const file of entry.inspection.evidence) assert.ok(existsSync(file), `${entry.id}: unresolved evidence ${file}`);
    assert.equal(entry.inspection.qualification, 'partial', 'A specimen alone must not claim complete qualification');
    assert.ok(entry.inspection.gaps.length, `${entry.id}: incomplete qualification is visible`);
  }
  const previous = structuredClone(catalog); previous.version = '0.3.0';
  assert.throws(() => requireCatalog(previous), /CATALOG_MISMATCH/);
});
