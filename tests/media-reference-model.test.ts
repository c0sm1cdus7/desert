import test from 'node:test';
import assert from 'node:assert/strict';
import {modelMediaReferences} from '../src/web/client/model-media-references.ts';
import {humanState} from '../src/web/client/state.ts';
import type {ControllerTransport} from '../src/web/client/transport.ts';
import {surface as original,scope} from './fixtures/labels.ts';
import type {HumanSurface,RecordView} from '../src/web/types.ts';
const collection='10000000-0000-4000-8000-000000000001';
const asset={kind:'asset' as const,reference:'10000000-0000-4000-8000-000000000002'};
test('media reference choices and image leases stay within the selected authorized member set',async()=>{
  const surface={...original,fieldMediaReferences:{'labeled-item.cover':{object:'media',media:'image',read:'read-media',memberOf:'collections'}}} as HumanSurface;
  const store=humanState(surface,scope);
  store.update({view:'edit',selectedId:collection,editing:{journeyId:'edit-item',subject:collection,expectedVersion:1,facts:{title:'Collection'},
    creationDraft:{draft:{},draftRevision:0,touchedFields:[]}},availability:{contractDigest:surface.contractDigest,journeys:{'read-media':{dependenciesReady:true,blockers:[]}}}});
  const records:RecordView[]=[
    {id:'10000000-0000-4000-8000-000000000003',version:1,facts:{image:asset,collections:[collection]}},
    {id:'10000000-0000-4000-8000-000000000004',version:1,facts:{image:{...asset,reference:'10000000-0000-4000-8000-000000000005'},collections:[]}},
    {id:'10000000-0000-4000-8000-000000000006',version:1,facts:{image:{...asset,reference:'10000000-0000-4000-8000-000000000007',media:'audio'},collections:[collection]}},
  ];
  const calls:{method:string;input:Record<string,unknown>}[]=[];
  const transport={async evidence(){throw new Error('unused');},async call(method:string,input:Record<string,unknown>){calls.push({method,input});
    if(method==='begin')return{id:'read-run'};if(method==='read')return records;throw new Error(method);},
    async image(input:Record<string,unknown>){calls.push({method:'image',input});return new Blob(['pixels'],{type:'image/webp'});}} as ControllerTransport;
  const model=modelMediaReferences(surface,store,transport,()=>true,'labeled-item');
  try{
    await model.refresh();
    assert.deepEqual(store.get().mediaReferences?.['labeled-item.cover']?.options,[{value:records[0]!.id,source:asset}]);
    assert.equal(model.imageContext({kind:'asset',reference:'10000000-0000-4000-8000-000000000005'}),undefined);
    const context=model.imageContext(asset);assert.ok(context);assert.ok(context.valid());
    await context.read(160,new AbortController().signal);
    assert.deepEqual(calls.at(-2),{method:'begin',input:{journeyId:'read-media',subject:records[0]!.id}});
    store.update({view:'detail'});assert.equal(context.valid(),false);assert.equal(model.imageContext(asset),undefined);
    store.update({view:'edit'});model.invalidate();assert.equal(context.valid(),false);
    assert.deepEqual(store.get().mediaReferences,{});
  }finally{model.stop();store.dispose();}
});
