export const groupedRowsSource = `<script lang="ts">
  import Collection from "@desert/svelte/catalog/compositions/collection/Collection.svelte";
  import ContextPanel from "@desert/svelte/catalog/compositions/context-panel/ContextPanel.svelte";
  import OptionsControl from "@desert/svelte/catalog/compositions/options-control/OptionsControl.svelte";
  import { applyControlEvent } from "@desert/interaction/control-nodes.ts";
  const choices = ['First','Middle','Last'].map(label => ({value:label,label,disabled:false}));
  let disabled = $state(false);
  let options = $state({version:'desert.control/1',kind:'options',id:'options',label:'Options',disabled:false,
    minSelected:0,maxSelected:1,selected:['First'],options:choices});
  let checks = $state({...options,id:'checks',label:'Checks',maxSelected:3});
  let content = $state({...options,id:'selection',label:'Selection'});
  let events = $state([]);
  let recordNode = $state({version:'desert.bank-node/1',kind:'collection',object:'record',fields:['title'],
    labels:{'record.title':'Title'},createLabel:'Create',loaded:true,disabled:false,selectedId:null,
    records:choices.map(option => ({id:option.value,version:1,facts:{title:option.label}}))});
  function disableAll() {
    disabled=true; recordNode={...recordNode,disabled:true}; options={...options,disabled:true}; checks={...checks,disabled:true};
    content={...content,disabled:true};
  }
</script>
<main style="max-width:600px;padding:16px">
  <section data-test="collection"><Collection node={recordNode} select={id => events.push('record:'+id)} /></section>
  <section data-test="actions"><ContextPanel fields={[]} facts={{}} object="record" labels={{}}
    actions={choices.map(option => ({id:option.value,label:option.label,available:!disabled,invoke:()=>events.push('action:'+option.value)}))} /></section>
  <section data-test="options"><OptionsControl node={options} onevent={event => {events.push('option');options=applyControlEvent(options,event).node;}} /></section>
  <section data-test="checks"><OptionsControl node={checks} onevent={event => {events.push('check');checks=applyControlEvent(checks,event).node;}} /></section>
  <section data-test="selection"><OptionsControl node={content} onevent={event => {events.push('selection');content=applyControlEvent(content,event).node;}} /></section>
</main>
<button onclick={disableAll}>Disable all</button><output data-events hidden>{JSON.stringify(events)}</output>`;
