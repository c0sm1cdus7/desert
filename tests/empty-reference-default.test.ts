import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLiteral } from '../src/check-assignments.ts';
import { labels } from '../src/field-definition.ts';
import { Check } from '@sinclair/typebox/value';
import { CommandSchema } from '../src/program-grammar.ts';

test('a reference/list default can only be the canonical empty list, never injected identities', () => {
  const command = {id:'create',kind:'create',object:'collection',input:[],values:{cover:{kind:'literal',value:[]}}};
  assert.equal(Check(CommandSchema,command),true);
  assert.doesNotThrow(() => checkLiteral(labels({maxItems:1,maxLength:36}),[],'cover'));
  assert.equal(Check(CommandSchema,{...command,values:{cover:{kind:'literal',value:['identity']}}}),false);
  assert.throws(() => checkLiteral(labels({maxItems:1,maxLength:36}),['identity'],'cover'),/requires input/);
});
