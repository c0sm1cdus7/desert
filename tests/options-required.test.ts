import test from 'node:test';
import assert from 'node:assert/strict';
import { optionsInputRequired, permitsOptionsSelection } from '../src/interaction/extended-controls.ts';
import { controlNode, selectInputRequired, applyControlEvent, type SelectNode } from '../src/interaction/control-nodes.ts';
import type { OptionsNode } from '../src/interaction/extended-nodes.ts';
import { compile } from '../src/compile.ts';
import { Notebook } from '../products/notebook/product.ts';
import { deriveForm } from '../src/interaction/form.ts';
import { emptyInputDraft } from '../src/web/client/input-draft.ts';
import type { ProductDefinition } from '../src/contracts.ts';
import type { HumanSurface } from '../src/web/types.ts';

const options: OptionsNode = { version:'desert.control/1',kind:'options',id:'choice',label:'Choice',disabled:false,
  minSelected:1,maxSelected:1,selected:[],options:[{value:'one',label:'One',disabled:false},{value:'two',label:'Two',disabled:false}] };

test('option cardinality never implies an input requirement for contextual commands', () => {
  for (const selected of [[],['one']]) {
    assert.equal(optionsInputRequired({...options,selected}),false);
    assert.equal(optionsInputRequired({...options,maxSelected:2,selected}),false);
    assert.equal(optionsInputRequired({...options,inputRequired:false,selected}),false);
  }
  assert.equal(optionsInputRequired({...options,inputRequired:true}),true);
  assert.equal(optionsInputRequired({...options,inputRequired:true,selected:['one']}),false);
  assert.equal(optionsInputRequired({...options,inputRequired:true,maxSelected:2}),true);
  assert.equal(optionsInputRequired({...options,inputRequired:true,minSelected:0}),false);
  assert.equal(permitsOptionsSelection({...options,inputRequired:true},[]),true,'Incomplete drafts remain editable');
  assert.throws(()=>controlNode({...options,inputRequired:'yes'}),/INVALID_CONTROL_NODE/);
});

test('select clearability stays independent from explicit input requirements',()=>{
  const select:SelectNode={version:'desert.control/1',kind:'select',id:'select',label:'Select',disabled:false,
    required:true,value:'one',options:options.options};
  assert.equal(selectInputRequired(select),false);
  assert.equal(selectInputRequired({...select,value:null,disabled:true}),false,'Unavailable context is not missing form participation');
  assert.equal(selectInputRequired({...select,inputRequired:true}),false,'An always-selected nonclearable input needs no marker');
  assert.equal(selectInputRequired({...select,inputRequired:true,required:false}),true,'A filled clearable required input retains its requirement');
  assert.equal(selectInputRequired({...select,inputRequired:true,value:null}),true);
  const event={kind:'select.change',control:select.id,value:null};
  assert.throws(()=>applyControlEvent(select,event),/INVALID_CONTROL_EVENT/,'Nonclearable selections cannot become empty');
  assert.equal(applyControlEvent({...select,inputRequired:true,required:false},event).node.kind,'select');
});

test('real operation validation requires incomplete text, but a nonclearable enum starts with a value', () => {
  const product:ProductDefinition=JSON.parse(JSON.stringify(Notebook));
  product.objects[0]!.facts.body={kind:'enum',values:['open','completed']};
  const human=product.surfaces?.find(surface=>surface.kind==='human');
  assert.ok(human);
  Object.assign(human,{fieldRepresentations:{...human.fieldRepresentations,'note.body':'text'}});
  const application=compile(product),surface=application.surface('human') as HumanSurface;
  const create=surface.journeys.find(journey=>journey.id==='create-note');
  assert.ok(create?.kind==='mutation');
  const fields=deriveForm(create,surface.fieldRepresentations);
  assert.equal(fields.find(field=>field.name==='title')!.required,true);
  assert.equal(fields.find(field=>field.name==='body')!.required,false);
  assert.deepEqual(emptyInputDraft(surface,create),{title:'',body:'open'});
  assert.equal(application.validateInput(create.commandId,{title:'',body:'open'}).valid,false);
  assert.equal(application.validateInput(create.commandId,{title:'Ready',body:'open'}).valid,true);
});
