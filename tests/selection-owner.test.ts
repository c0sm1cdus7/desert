import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import SelectControl from "@desert/svelte/catalog/compositions/select-control/SelectControl.svelte";
  import MoneyControl from "@desert/svelte/catalog/compositions/money-control/MoneyControl.svelte";
  import { controlNode, applyControlEvent } from "@desert/interaction/control-nodes.ts";
  let selection = $state.raw(controlNode({version:'desert.control/1',kind:'select',id:'delivery',label:'Delivery',
    disabled:false,required:true,value:'collect',options:[{value:'collect',label:'Collect',disabled:false},
      {value:'closed',label:'Closed',disabled:true},{value:'deliver',label:'Deliver',disabled:false}]}));
  let money = $state.raw(controlNode({version:'desert.control/1',kind:'money',id:'amount',label:'Amount',disabled:false,
    required:false,currencies:[{code:'ARS',scale:2},{code:'USD',scale:2},{code:'JPY',scale:0}],currency:'ARS',minorUnits:'100'}));
  let edits = $state(0), outside = $state(0);
</script>
<div data-surface-host style="width:min(900px,100%)">
  {#if selection.kind === 'select'}<SelectControl node={selection} onevent={event => { selection = applyControlEvent(selection,event).node; edits += 1; }} />{/if}
  {#if money.kind === 'money'}<MoneyControl node={money} onevent={event => { money = applyControlEvent(money,event).node; edits += 1; }} />{/if}
</div>
<button style="position:fixed;bottom:12px;left:12px" onclick={()=>outside+=1}>Outside action</button><output data-outside>{outside}</output>
<output data-owner-money>{JSON.stringify(money)}</output><output data-owner-selection>{JSON.stringify(selection)}</output><output data-edits>{edits}</output>`;

test("selection is a genuine listbox: navigation does not commit, activation does, Escape cancels exploration", async () => {
  const f = await svelteBrowser(source);
  try {
    const trigger = f.page.getByRole("button", { name: "Delivery · Collect", exact: true });
    assert.equal(await trigger.getAttribute("aria-haspopup"),"listbox");
    await trigger.click();
    const panel = f.page.getByRole("listbox");
    assert.equal(await panel.getByRole("button").count(), 0, 'Options expose option semantics, not action semantics');
    assert.equal(await f.page.locator('.scrim,[aria-modal="true"],[data-surface-slot]').count(), 0);
    await f.page.keyboard.press("End");
    assert.equal(await panel.getByRole("option", {name:"Deliver",exact:true}).getAttribute("data-highlighted"), "");
    assert.equal(await f.page.locator("[data-edits]").innerText(), "0");
    await f.page.keyboard.press("Escape");
    await panel.waitFor({state:"hidden"});
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
    await trigger.click(); await f.page.keyboard.press("ArrowDown");
    assert.equal(await panel.getByRole("option", {name:"Deliver",exact:true}).getAttribute("data-highlighted"), "");
    await f.page.keyboard.press("Enter");
    await panel.waitFor({state:"hidden"});
    assert.equal(JSON.parse(await f.page.locator("[data-owner-selection]").innerText()).value, "deliver");
    assert.equal(await f.page.locator("[data-edits]").innerText(), "1");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("compact selection is a bottom sheet and its scrim dismisses without activating the covered action", async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width:390,height:700});
    const trigger=f.page.getByRole("button",{name:"Delivery · Collect",exact:true});
    await trigger.click(); const panel=f.page.getByRole("listbox");
    const sheet=f.page.locator('[data-picker-sheet]');
    assert.equal(await sheet.getAttribute('aria-modal'),'true');
    await sheet.evaluate(async element=>{await Promise.all(element.getAnimations().map(animation=>animation.finished));});
    const bounds=(await sheet.boundingBox())!;
    assert.ok(bounds.x>=11 && bounds.x+bounds.width<=379);
    await f.page.mouse.click(5,5);
    await panel.waitFor({state:"hidden"});
    assert.equal(await f.page.locator('[data-outside]').innerText(),'0');
    await f.page.getByRole("button",{name:"Outside action",exact:true}).click();
    assert.equal(await f.page.locator('[data-outside]').innerText(),'1');
    assert.equal(await f.page.locator('[data-edits]').innerText(),'0');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test("currency activation preserves writing and exact numeric amount across scales; invalid precision blocks without loss", async () => {
  const f=await svelteBrowser(source);
  try {
    const amount=f.page.getByRole('textbox',{name:'Amount',exact:true});
    await amount.fill('001.00');
    await f.page.getByRole('button',{name:'ARS · Amount currency',exact:true}).click();
    await f.page.getByRole('option',{name:'USD',exact:true}).click();
    assert.equal(await amount.inputValue(),'001.00');
    assert.equal(JSON.parse(await f.page.locator('[data-owner-money]').innerText()).minorUnits,'100');
    await f.page.getByRole('button',{name:'USD · Amount currency',exact:true}).click();
    await f.page.getByRole('option',{name:'JPY',exact:true}).click();
    assert.equal(await amount.inputValue(),'001.00');
    let owner=JSON.parse(await f.page.locator('[data-owner-money]').innerText());
    assert.equal(owner.currency,'JPY'); assert.equal(owner.minorUnits,'1');
    await f.page.getByRole('button',{name:'JPY · Amount currency',exact:true}).click();
    await f.page.getByRole('option',{name:'ARS',exact:true}).click();
    await amount.fill('1.23');
    await f.page.getByRole('button',{name:'ARS · Amount currency',exact:true}).click();
    await f.page.getByRole('option',{name:'JPY',exact:true}).click();
    owner=JSON.parse(await f.page.locator('[data-owner-money]').innerText());
    assert.equal(owner.currency,'ARS'); assert.equal(owner.minorUnits,'123');
    assert.equal(await amount.inputValue(),'1.23');
    assert.equal(await f.page.getByRole('button',{name:'ARS · Amount currency',exact:true}).count(),1);
    assert.match(await f.page.locator('[data-measure="amount"] [role="status"]').innerText(),/JPY/);
    await amount.fill('-');
    await f.page.getByRole('button',{name:'ARS · Amount currency',exact:true}).click();
    await f.page.getByRole('option',{name:'USD',exact:true}).click();
    assert.equal(await amount.inputValue(),'-');
    assert.equal(JSON.parse(await f.page.locator('[data-owner-money]').innerText()).currency,'ARS');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test("selection dismisses when focus moves to another field without stealing its focus",async()=>{
  const f=await svelteBrowser(source);
  try {
    await f.page.getByRole('button',{name:'Delivery · Collect',exact:true}).click();
    const panel=f.page.getByRole('listbox');await panel.waitFor();
    await f.page.waitForFunction(()=>document.activeElement?.matches('[data-slot="popover-content"]'));
    const field=f.page.getByRole('textbox',{name:'Amount',exact:true});
    await field.focus();await panel.waitFor({state:'hidden'});
    assert.equal(await field.evaluate(element=>element===document.activeElement),true);
    assert.equal(await f.page.locator('[data-edits]').innerText(),'0');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('dismissal never restores selection focus over another popover', async () => {
  const f=await svelteBrowser(`<script>
    import Choice from '@desert/svelte/catalog/foundations/choice/Choice.svelte';
    import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
    let unavailable=$state(false), details=$state(false);
  </script><Choice presentation="menu" cardinality="one" menuTrigger="contextual" label="Choice" labelVisibility="visible" selected={["first"]}
    disabled={unavailable} required={false} options={[{value:'first',label:'First',disabled:false}]} onchange={()=>{}}/>
    <Popover.Root bind:open={details}><Popover.Trigger onclick={()=>unavailable=true}>Other details</Popover.Trigger>
      <Popover.Content role="dialog" aria-label="Other details"><button>Other action</button></Popover.Content>
    </Popover.Root>`);
  try {
    await f.page.getByRole('button',{name:'Choice',exact:true}).click();
    await f.page.getByRole('listbox').waitFor();
    await f.page.getByRole('button',{name:'Other details',exact:true}).click();
    const other=f.page.getByRole('dialog',{name:'Other details'});
    await other.waitFor();
    await f.page.waitForFunction(()=>document.querySelector('[role="dialog"]')?.contains(document.activeElement));
    await f.page.getByRole('listbox').waitFor({state:'hidden'});
    assert.equal(await other.evaluate(element=>element.contains(document.activeElement)),true);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
