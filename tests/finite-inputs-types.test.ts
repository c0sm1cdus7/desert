import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
// svelte-check of the generated project, not the gate: the test-only evidence project (plan 3.5) while the strict build is red.
import { createEvidenceProject } from "../src/testing/evidence-project.ts";

test("actual Svelte APIs reject arbitrary native attributes without duplicating prop schemas", {timeout:60000}, async () => {
  const project=createEvidenceProject("export const surface = {}; export const validateInput = () => false;");
  const path=join(project.directory,"src/routes/+page.svelte");
  // Place, SearchField, MaskedInput and MeasuredField were absorbed by Surface and Field (deleted in Batch 3): the same
  // native passthroughs are refused on the foundations that draw them now.
  const header=`<script lang="ts">
    import { Surface, Field } from '@desert/svelte/catalog/index.ts';
    import type {InputMask} from '@desert/interaction/input-mask.ts';
    const mask:InputMask={kind:'decimal',locale:'en-US',scale:2};
  </script>
  {#snippet top()}top{/snippet}{#snippet content()}content{/snippet}
`;
  const field='label="Find" labelVisibility="accessible" required={false} invalid={false} disabled={false} measure="fill" value="" clear';
  const search=`<Field primitive="input.text" purpose="search" ${field}`, masked=`<Field primitive="input.text" purpose="text" {mask} ${field}`;
  const invalid=[
    '<Surface kind="main" label="Notes" searching={false} {top} {content} class="foreign"/>',
    '<Surface kind="main" label="Notes" searching={false} {top} {content} style="padding:0"/>',
    '<Surface kind="main" label="Notes" searching={false} {top} {content} viewportAttributes={{style:"padding:0"}}/>',
    `${search} class="foreign"/>`,`${search} style="padding:0"/>`,`${search} onclick={()=>{}}/>`,`${search} type="text"/>`,
    `${masked} class="foreign"/>`,`${masked} style="padding:0"/>`,`${masked} onkeydown={()=>{}}/>`,
    `${search} orientation="horizontal"/>`,`<Field primitive="input.text" purpose="text" label="Find" labelVisibility="accessible" required={false} invalid={false} disabled={false} measure="wide" value="" clear/>`,
  ];
  try {
    const source=header+invalid.join('\n');writeFileSync(path,source);
    await assert.rejects(project.run('check'),error=>{
      const lines=String(error).split('\n').filter(line=>line.startsWith(path+':')).map(line=>Number(line.match(/:(\d+):\d+$/)?.[1]));
      assert.deepEqual([...new Set(lines)],invalid.map(line=>source.split('\n').indexOf(line)+1),String(error));
      return true;
    });
    writeFileSync(path,header+'<Surface kind="main" label="Notes" searching={false} {top} {content}/>'
      +`${search} onchange={()=>{}}/>${masked} onchange={()=>{}}/>`);
    assert.match((await project.run('check')).stdout,/0 errors and 0 warnings/);
  } finally {project.close();}
});
