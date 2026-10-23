import test from 'node:test';
import assert from 'node:assert/strict';
import {projectView,projectViewPanel} from '../src/web/client/view-projection.ts';
import {readModelScope} from '../src/web/client/model-scope.ts';
import {humanState} from '../src/web/client/state.ts';
import {program,surface} from './fixtures/view-program.ts';
import {objectAttentionKey,type AttentionSignal} from '../src/attention.ts';
import type {AttentionSnapshot} from '../src/web/client/attention-feed.ts';
import {resolvedNode} from '../src/interaction/resolved-node.ts';

test('Home, collection and detail project the same authorized signals, never a domain status',()=>{
  const scope=readModelScope(surface,{read:'read-note',creations:[],subjectActions:[]});
  const store=humanState(surface,scope),read=program.journeys[1];
  const id='10000000-0000-4000-8000-000000000001';
  const record={id,version:1,facts:{title:'Note',body:'Read it',state:'active'}};
  const signal:AttentionSignal={version:'desert.attention/1',source:{kind:'activity',id:'10000000-0000-4000-8000-000000000002',revision:1,journey:'edit-note'},
    recipient:'identity',target:{kind:'object',object:'note',id},reason:'activity.resume',resolution:'producer'};
  const attention:AttentionSnapshot={loaded:true,error:null,items:[{id:signal.source.id,journey:'edit-note',title:'Edit note',description:'Continue',available:true,signals:[signal]}],
    objectSignals:{[objectAttentionKey('note',id)]:[signal]}};
  store.update({records:[record],loaded:true,availability:{contractDigest:surface.contractDigest,journeys:{'read-note':{dependenciesReady:true,blockers:[]}}}});
  try{
    const list=projectView(program,read,program.views[1],surface,store.get(),()=>true,scope,new Map(),undefined,attention).bindings.records;
    assert.equal(list?.kind,'collection');if(list?.kind!=='collection')throw new Error('collection');
    assert.deepEqual(list.attention?.[id],attention.items[0]!.signals);
    const overview={...program.journeys[0],collections:[{input:'recent',read:read.id,limit:4}],outputs:[]};
    const overviewView={version:'desert.view/1' as const,id:'overview',content:[{kind:'collection' as const,id:'recent',input:'recent',output:'select'}]};
    const home=projectView(program,overview,overviewView,surface,store.get(),()=>true,{kind:'presentation'},
      new Map([[read.id,{journey:read,state:store.get(),scope}]]),undefined,attention).bindings.recent;
    assert.deepEqual(home?.kind==='collection'?home.attention?.[id]:undefined,list.attention?.[id]);
    store.update({view:'detail',selectedId:id,detail:record});
    const panel=projectViewPanel(program,read,program.views[2],surface,store.get(),()=>true,scope,attention);
    assert.equal(panel.frame.content.kind,'context');
    if(panel.frame.content.kind!=='context')throw new Error('context');
    assert.deepEqual(panel.frame.content.attention,list.attention?.[id]);
    const plain=projectViewPanel(program,read,program.views[2],surface,store.get(),()=>true,scope);
    assert.equal(plain.frame.content.kind==='context'?plain.frame.content.attention:undefined,undefined);
    store.update({availability:{contractDigest:surface.contractDigest,journeys:{'read-note':{dependenciesReady:false,blockers:[]}}}});
    const blocked=projectView(program,read,program.views[1],surface,store.get(),()=>true,scope,new Map(),undefined,attention).bindings.records;
    assert.equal(blocked?.kind==='collection'?blocked.attention:undefined,undefined);
    assert.throws(()=>resolvedNode({...list,attention:{[id]:[{...signal,target:{kind:'object',object:'task',id}}]}}),/INVALID_BANK_COLLECTION/);
  }finally{store.dispose();}
});
