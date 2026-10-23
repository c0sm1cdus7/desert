import test from 'node:test';
import assert from 'node:assert/strict';
import { objectType, text, enumeration, principal, references } from '../src/index.ts';
import { emitField } from '../src/schema.ts';
import { createSchemaValidator } from '../src/validation.ts';
const Project = objectType({ id:'project', facts:{ name:text({minLength:1,maxLength:64}), color:enumeration(['blue','rose']), owner:principal() } });
test('references are typed bounded UUID associations, not freeform project names', () => {
  const field = references(Project,{label:'name',color:'color'});
  assert.deepEqual(field.reference,{object:'project',label:'name',color:'color'});
  const valid = createSchemaValidator(emitField(field));
  assert.ok(valid([]));
  assert.ok(valid(['f7000000-0000-4000-8000-000000000001']));
  assert.equal(valid(['Personal']),false);
  assert.equal(valid(['f7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000001']),false);
  assert.throws(() => Reflect.apply(references,null,[Project,{label:'owner',color:'color'}]),/INVALID_REFERENCE/);
});
