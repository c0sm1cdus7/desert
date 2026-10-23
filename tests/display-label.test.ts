import assert from 'node:assert/strict';
import test from 'node:test';
import { Check } from '@sinclair/typebox/value';
import { displayLabel } from '../src/interaction/display-label.ts';
import { FaceSchema } from '../src/interaction/face.ts';
import { ViewDestinationLinkSchema } from '../src/views/schema.ts';

test('display labels capitalize only their initial letter, never rewrite the remaining label',()=>{
  for(const [input,expected] of [['notes','Notes'],['API version','API version'],['étiquette privée','Étiquette privée'],['  status: open','  Status: open'],['123','123'],['','']])
    assert.equal(displayLabel(input!),expected);
});
test('action faces and destination glyphs accept only the closed semantic icon vocabulary',()=>{
  assert.equal(Check(FaceSchema,{kind:'icon',icon:'archive'}),true);
  assert.equal(Check(FaceSchema,{kind:'icon',icon:'external-svg'}),false);
  const destination={kind:'destination-link',id:'trash',output:'trash',label:'Trash'};
  assert.equal(Check(ViewDestinationLinkSchema,{...destination,icon:'archive'}),true);
  assert.equal(Check(ViewDestinationLinkSchema,{...destination,icon:'external-svg'}),false);
});
