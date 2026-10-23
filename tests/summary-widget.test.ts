import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionSummary } from '../src/interaction/collection-summary.ts';
import { runtimeFixture, until } from './fixtures/view-program-runtime.ts';
import { program } from './fixtures/view-program.ts';

test('summary widgets count authorized values without turning domain state into attention', () => {
  const summary=collectionSummary([{id:'a',version:1,facts:{status:'open'}},
    {id:'b',version:1,facts:{status:'completed'}},{id:'c',version:1,facts:{status:'open'}}],
    {field:'status',segments:[{value:'open',label:'Open'},{value:'completed',label:'Completed'}]});
  assert.deepEqual(summary,{total:3,segments:[{value:'open',label:'Open',count:2},{value:'completed',label:'Completed',count:1}]});
  assert.equal('attention' in summary,false);
});

test('summary widgets reject unknown or missing values rather than fabricating zero', () => {
  const definition={field:'status',segments:[{value:'open',label:'Open'}]};
  assert.throws(()=>collectionSummary([{id:'a',version:1,facts:{status:'unknown'}}],definition),/INVALID_WIDGET_VALUE/);
  assert.throws(()=>collectionSummary([{id:'a',version:1,facts:{}}],definition),/INVALID_WIDGET_VALUE/);
  assert.deepEqual(collectionSummary([],definition),{total:0,segments:[{value:'open',label:'Open',count:0}]});
});

test('an offline cached summary navigates to its read destination without controller calls or write authority',async t=>{
  const definition=structuredClone(program) as any;
  definition.views[0].content[1]={kind:'stack',id:'widgets',title:'Widgets',items:[{kind:'collection',id:'summary',
    input:'notes',output:'notes',presentation:{kind:'summary-widget',title:'Notes',description:'Writing at a glance.',totalLabel:'Notes'}}]};
  definition.journeys[0].collections=[{input:'notes',read:'read-note',limit:200,
    summary:{field:{object:'note',field:'state'},segments:[{value:'active',label:'Active'},{value:'archived',label:'Archived'}]}}];
  const {model,connection,calls,emit}=await runtimeFixture(t,{definition});
  await until(()=>{const node=model.snapshot().resolved.bindings.notes;return node?.kind==='collection'&&node.loaded;});
  connection.ready=false;
  await until(()=>Object.values(model.snapshot().state.availability.journeys).every(item=>!item.dependenciesReady));
  const widget=model.snapshot().resolved.bindings.notes;
  assert.equal(widget?.kind,'collection');
  if(widget?.kind!=='collection')return;
  assert.equal(widget.connection,'offline');
  assert.equal(widget.loaded,true);
  assert.equal(widget.disabled,false,'the card performs local navigation, not a controller action');
  assert.equal(model.snapshot().resolved.disabledOutputs.includes('notes'),false);
  const before=calls.length;
  emit({kind:'surface.invoke',intent:{kind:'view.output',view:'home',output:'notes'}});
  assert.equal(model.snapshot().activeDestination,'notes');
  assert.equal(model.snapshot().state.records.length,1);
  assert.equal(model.snapshot().panel,null);
  emit({kind:'surface.invoke',intent:{kind:'view.output',view:'notes',output:'create'}});
  assert.equal(model.snapshot().state.view,'list','offline browsing never grants creation authority');
  assert.equal(calls.slice(before).filter(call=>['begin','read','prepare','accept'].includes(call.method)).length,0);
});
