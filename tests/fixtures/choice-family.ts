export const choiceOptions = [
  { value: 'alpine', label: 'Alpine trail', description: 'A quiet route.', disabled: false },
  { value: 'alps', label: 'Alpine trail', description: 'A second route.', disabled: false },
  { value: 'beach', label: 'Beach walk', description: 'A coastal route.', disabled: false },
  { value: 'closed', label: 'Closed route', description: 'Unavailable today.', disabled: true },
];

// OptionsControl still draws the old rows (ChoiceRow, ChoiceList) until its lane mounts Choice; Choice's rows and menu
// sit beside them so one page measures the old anatomy against the new.
export const choiceFamilySource = `<script lang="ts">
  import OptionsControl from '@desert/svelte/catalog/compositions/options-control/OptionsControl.svelte';
  import Choice from '@desert/svelte/catalog/foundations/choice/Choice.svelte';
  import { controlNode, applyControlEvent } from '@desert/interaction/control-nodes.ts';
  const options = ${JSON.stringify(choiceOptions)};
  const descriptor = {version:'desert.control/1',kind:'options',disabled:false,inputRequired:true,minSelected:1,options};
  let single = $state.raw(controlNode({...descriptor,id:'single',label:'Inline route',maxSelected:1,selected:['alpine']}));
  let multiple = $state.raw(controlNode({...descriptor,id:'multiple',label:'Interests',maxSelected:2,selected:['alpine']}));
  let selected = $state('alpine'), one = $state(['alpine']), many = $state(['alpine']);
</script>
<main style="padding:24px;max-width:480px">
  <section data-case="single">{#if single.kind === 'options'}<OptionsControl node={single} onevent={event => single = applyControlEvent(single,event).node} />{/if}</section>
  <section data-case="multiple">{#if multiple.kind === 'options'}<OptionsControl node={multiple} onevent={event => multiple = applyControlEvent(multiple,event).node} />{/if}</section>
  <section data-case="choice-single"><Choice presentation="rows" cardinality="one" label="Choice route" labelVisibility="visible" {options}
    selected={one} disabled={false} required={false} onchange={next => one = [...next]} /></section>
  <section data-case="choice-multiple"><Choice presentation="rows" cardinality="many" label="Choice interests" labelVisibility="visible" {options}
    selected={many} disabled={false} required onchange={next => many = [...next]} /></section>
  <section data-case="picker"><Choice presentation="menu" cardinality="one" menuTrigger="contextual" label="Picker route" labelVisibility="visible"
    {options} selected={[selected]} disabled={false} required onchange={next => selected = next[0]} /></section>
  <output data-single>{single.kind === 'options' ? single.selected.join(',') : ''}</output>
  <output data-multiple>{multiple.kind === 'options' ? multiple.selected.join(',') : ''}</output>
  <output data-picker>{selected}</output>
</main>`;
