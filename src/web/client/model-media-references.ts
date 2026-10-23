import type {HumanSurface,RecordView} from '../types.ts';
import type {HumanStore} from './state.ts';
import {TransportError,type ControllerTransport} from './transport.ts';
import type {AssetReference} from '../../assets/types.ts';
import type {PrivateImageContext} from './private-images.ts';
import type {MediaReferenceState} from '../../interaction/labels-control.ts';
import {Check} from '@sinclair/typebox/value';
import {AssetReferenceSchema} from '../../assets/types.ts';

/** Image choices are projected from an authorized read and scoped to this editor's subject. */
export function modelMediaReferences(surface:HumanSurface,store:HumanStore,transport:ControllerTransport,active:()=>boolean,object?:string){
  const capabilities=Object.fromEntries(Object.entries(surface.fieldMediaReferences ?? {}).filter(([key])=>object!==undefined&&key.startsWith(`${object}.`)));
  let epoch=0;
  const records=new Map<string,readonly RecordView[]>();
  const pending=new Map<string,string>();
  const subject=()=>store.get().editing?.subject ?? store.get().selectedId;
  function update(key:string,value:MediaReferenceState){if(active())store.update({mediaReferences:{...store.get().mediaReferences,[key]:value}});}
  async function load(key:string){
    const ref=capabilities[key],currentSubject=subject(),revision=epoch,identity=`${revision}:${currentSubject ?? ''}`;
    if(!ref||!active()||pending.get(key)===identity)return;
    if(!store.get().availability.journeys[ref.read]?.dependenciesReady){records.delete(key);update(key,{options:[],loading:false});return;}
    if(ref.memberOf&&!currentSubject){records.delete(key);update(key,{options:[],loading:false});return;}
    pending.set(key,identity);records.delete(key);update(key,{options:[],loading:true});
    try{
      const run=await transport.call('begin',{journeyId:ref.read});
      const all=await transport.call('read',{runId:run.id});
      if(!active()||revision!==epoch||subject()!==currentSubject)return;
      const choices=all.filter(record=>{const asset=record.facts[ref.media],members=ref.memberOf?record.facts[ref.memberOf]:undefined;
        return Check(AssetReferenceSchema,asset)&&(!asset.media||asset.media==='image')&&(!ref.memberOf||Array.isArray(members)&&members.includes(currentSubject!));});
      records.set(key,choices);
      update(key,{options:choices.map(record=>({value:record.id,source:record.facts[ref.media] as AssetReference})),loading:false});
    }catch{if(active()&&revision===epoch&&subject()===currentSubject)update(key,{options:[],loading:false,error:'Could not load images. Try again.'});}
    finally{if(pending.get(key)===identity)pending.delete(key);}
  }
  function imageContext(asset:AssetReference):PrivateImageContext|undefined{
    if(!active()||!transport.image||store.get().view!=='edit')return;
    for(const [key,items]of records){
      const ref=capabilities[key]!,record=items.find(item=>(item.facts[ref.media] as AssetReference)?.reference===asset.reference);
      if(!record)continue;
      const revision=epoch,currentSubject=subject();
      const valid=()=>active()&&epoch===revision&&store.get().view==='edit'&&subject()===currentSubject
        &&store.get().availability.journeys[ref.read]?.dependenciesReady===true
        &&records.get(key)?.some(item=>item.id===record.id&&item.version===record.version&&(item.facts[ref.media] as AssetReference).reference===asset.reference)===true;
      return{valid,async read(variant,signal){const run=await transport.call('begin',{journeyId:ref.read,subject:record.id});
        if(!valid()||signal.aborted)throw new TransportError('IMAGE_READ_EXPIRED');
        return transport.image!({runId:run.id,reference:asset.reference,variant},{signal});}};
    }
  }
  return{imageContext,refresh:()=>Promise.all(Object.keys(capabilities).map(load)).then(()=>{}),
    event(field:string){return load(`${object}.${field}`);},invalidate(){epoch++;records.clear();pending.clear();store.update({mediaReferences:{}});},
    stop(){epoch++;records.clear();pending.clear();}};
}
