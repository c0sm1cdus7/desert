export const choiceOptions = [
  { value: 'alpine', label: 'Alpine trail', description: 'A quiet route.', disabled: false },
  { value: 'alps', label: 'Alpine trail', description: 'A second route.', disabled: false },
  { value: 'beach', label: 'Beach walk', description: 'A coastal route.', disabled: false },
  { value: 'closed', label: 'Closed route', description: 'Unavailable today.', disabled: true },
];

export const choiceFamilySource = `<script lang="ts">
  import OptionsControl from '@desert/svelte/controls/OptionsControl.svelte';
  import SelectionField from '@desert/svelte/pieces/SelectionField.svelte';
  import { controlNode, applyControlEvent } from '@desert/interaction/control-nodes.ts';
  const options = ${JSON.stringify(choiceOptions)};
  const descriptor = {version:'desert.control/1',kind:'options',disabled:false,minSelected:1,options};
  let single = $state.raw(controlNode({...descriptor,id:'single',label:'Inline route',maxSelected:1,selected:['alpine']}));
  let multiple = $state.raw(controlNode({...descriptor,id:'multiple',label:'Interests',maxSelected:2,selected:['alpine']}));
  let selected = $state('alpine');
</script>
<main style="padding:24px;max-width:480px">
  <section data-case="single">{#if single.kind === 'options'}<OptionsControl node={single} onevent={event => single = applyControlEvent(single,event).node} />{/if}</section>
  <section data-case="multiple">{#if multiple.kind === 'options'}<OptionsControl node={multiple} onevent={event => multiple = applyControlEvent(multiple,event).node} />{/if}</section>
  <section data-case="picker"><SelectionField selection="route" label="Picker route" options={options} value={selected} required onchange={value => selected=value} /></section>
  <output data-single>{single.kind === 'options' ? single.selected.join(',') : ''}</output>
  <output data-multiple>{multiple.kind === 'options' ? multiple.selected.join(',') : ''}</output>
  <output data-picker>{selected}</output>
</main>`;
