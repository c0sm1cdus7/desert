import test from 'node:test';
import assert from 'node:assert/strict';
// The compiled View contract; declared views delegate to it.
import {compiledView as view} from '../src/views/view.ts';
import {surfaceFrame} from '../src/interaction/surface-frame.ts';

test('creation groups are a finite top-toolbar policy with distinct choices, never a footer style',()=>{
  const actions=[{output:'task',label:'Create task',icon:'confirm'},{output:'project',label:'Create project',icon:'catalog'}];
  const base={version:'desert.view/1',id:'tasks',outputs:['task','project'],content:[]};
  assert.doesNotThrow(()=>view({...base,topDock:{kind:'toolbar',actionGroup:'create',actions}}));
  assert.throws(()=>view({...base,bottomDock:{kind:'toolbar',actionGroup:'create',actions}}),/INVALID_VIEW_ACTION_GROUP/);
  assert.throws(()=>view({...base,topDock:{kind:'toolbar',actionGroup:'create',actions:actions.slice(0,1)}}),/INVALID_VIEW_ACTION_GROUP/);
  assert.throws(()=>view({...base,topDock:{kind:'toolbar',actionGroup:'custom',actions}}),/INVALID_VIEW/);
});

test('step navigation is explicit and cannot be applied to object contexts or arbitrary footer layouts',()=>{
  const base={version:'desert.surface-frame/6',top:{title:'Wizard'},content:{kind:'message',text:'Step one'},bottom:{}};
  assert.doesNotThrow(()=>surfaceFrame({...base,kind:'journey',navigation:'steps'}));
  for(const kind of ['context','specimen','message'])assert.throws(()=>surfaceFrame({...base,kind,navigation:'steps'}),/INVALID_SURFACE_FRAME/);
  assert.throws(()=>surfaceFrame({...base,kind:'journey',navigation:'right'}),/INVALID_SURFACE_FRAME/);
});
