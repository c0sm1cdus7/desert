import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import { Calendar } from "@desert/svelte/vendor/components/ui/calendar/index.js";
  import { parseDate } from '@internationalized/date';
  import TextInput from "@desert/svelte/pieces/TextInput.svelte";
  import * as Field from "@desert/svelte/vendor/components/ui/field/index.js";
  import { Badge } from "@desert/svelte/vendor/components/ui/badge/index.js";
  const node={version:'desert.control/1',kind:'date',id:'arrival',label:'Arrival',required:false,disabled:false,value:'2026-10-15'};
</script>
<main data-test-host style="width:640px;padding:16px;max-width:100%">
  <Field.FieldGroup>
    <Field.Field data-control="date" class="@container">
      <Calendar type="single" value={parseDate(node.value)} calendarLabel={node.label}
        style="width:calc(7*var(--cell-size) + 1rem);--cell-size:max(2rem,min(2.75rem,calc((100cqi - 1.25rem)/7)))" />
    </Field.Field>
    <TextInput primitive="input.text" label="Name" value="A value" required={false} disabled={false} onchange={()=>{}} />
    <Field.Field data-test-intrinsic><Field.FieldLabel>Classification</Field.FieldLabel><Badge>Local draft</Badge></Field.Field>
  </Field.FieldGroup>
</main>`;

test("calendar and intrinsic Field children keep their own width while ordinary field wells still fill the group", {timeout:20000}, async t => {
  const f=await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width:900,height:1000});
    for(const profile of ['default','apple-reference']) for(const width of [640,358,280]) {
      await f.page.evaluate(({profile,width})=>{
        document.documentElement.dataset.rendererProfile=profile;
        (document.querySelector('[data-test-host]') as HTMLElement).style.width=`${width}px`;
      },{profile,width});
      const geometry=await f.page.locator('[data-control="date"]').evaluate(field=>{
        const calendar=field.querySelector<HTMLElement>('[role="application"]')!;
        const style=getComputedStyle(calendar), root=calendar.getBoundingClientRect();
        const cells=[...calendar.querySelectorAll('tbody tr:first-child td')].map(cell=>cell.getBoundingClientRect());
        const nav=calendar.querySelector('nav')!.getBoundingClientRect();
        return {field:field.getBoundingClientRect().width,calendar:root.width,days:cells.at(-1)!.right-cells[0]!.left,
          inset:parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth),
          navigation:nav.width,dayWidth:cells[0]!.width,scroll:calendar.scrollWidth,client:calendar.clientWidth};
      });
      t.diagnostic(JSON.stringify({profile,width,...geometry}));
      assert.ok(Math.abs(geometry.calendar-geometry.days-geometry.inset)<1,"calendar boundary follows its seven-day grid, not the whole Field");
      assert.ok(Math.abs(geometry.navigation-geometry.days)<1,"navigation arrows align with the day grid");
      assert.ok(geometry.calendar<=geometry.field+.5 && geometry.scroll<=geometry.client+1,"compact calendar remains contained");
      assert.ok(geometry.dayWidth>=32,"readable day cells do not collapse to text width");
      if(width===640) assert.ok(geometry.calendar<geometry.field,"intrinsic calendar does not stretch across a wide Field");
      const siblings=await f.page.evaluate(()=>{
        const well=document.querySelector<HTMLElement>('[data-floating-field]')!;
        const badge=document.querySelector<HTMLElement>('[data-test-intrinsic] [data-slot="badge"]')!;
        return {well:well.getBoundingClientRect().width,field:well.parentElement!.getBoundingClientRect().width,
          badge:badge.getBoundingClientRect().width,badgeField:badge.parentElement!.getBoundingClientRect().width};
      });
      assert.ok(Math.abs(siblings.well-siblings.field)<1,"ordinary input wells still fill their Field");
      assert.ok(siblings.badge<siblings.badgeField/2,"an explicitly intrinsic sibling must not become a full-width pill");
    }
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
