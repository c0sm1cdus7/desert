import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBuildProject } from "../src/build/svelte/project.ts";

test("actual Svelte APIs reject arbitrary native attributes without duplicating prop schemas", {timeout:60000}, async () => {
  const project=createBuildProject("export const surface = {}; export const validateInput = () => false;");
  const path=join(project.directory,"src/routes/+page.svelte");
  const header=`<script lang="ts">
    import Place from '@desert/svelte/pieces/Place.svelte';
    import Search from '@desert/svelte/pieces/SearchField.svelte';
    import Masked from '@desert/svelte/pieces/MaskedInput.svelte';
    import Measured from '@desert/svelte/pieces/MeasuredField.svelte';
    import type {InputMask} from '@desert/interaction/input-mask.ts';
    const mask:InputMask={kind:'decimal',locale:'en-US',scale:2};
  </script>
  {#snippet top()}top{/snippet}{#snippet content()}content{/snippet}
`;
  const invalid=[
    '<Place {top} {content} class="foreign"/>','<Place {top} {content} style="padding:0"/>',
    '<Place {top} {content} viewportAttributes={{style:"padding:0"}}/>',
    '<Search class="foreign"/>','<Search style="padding:0"/>','<Search onclick={()=>{}}/>','<Search type="text"/>',
    '<Masked {mask} value="1" onvalue={()=>{}} class="foreign"/>','<Masked {mask} value="1" onvalue={()=>{}} style="padding:0"/>',
    '<Masked {mask} value="1" onvalue={()=>{}} onkeydown={()=>{}}/>',
    '<Measured kind="input.text" class="foreign"/>','<Measured kind="input.text" style="padding:0"/>','<Measured kind="input.text" orientation="horizontal"/>',
    '<Measured kind="input.text" measure="date"/>',
  ];
  try {
    const source=header+invalid.join('\n');writeFileSync(path,source);
    await assert.rejects(project.run('check'),error=>{
      const lines=String(error).split('\n').filter(line=>line.startsWith(path+':')).map(line=>Number(line.match(/:(\d+):\d+$/)?.[1]));
      assert.deepEqual([...new Set(lines)],invalid.map(line=>source.split('\n').indexOf(line)+1),String(error));
      return true;
    });
    writeFileSync(path,header+'<Place {top} {content} landmark="main" label="Notes"/>'
      +'<Search aria-label="Find" onvalue={()=>{}}/><Masked {mask} value="1" onvalue={()=>{}}/>'
      +'<Measured kind="input.text">content</Measured>');
    assert.match((await project.run('check')).stdout,/0 errors and 0 warnings/);
  } finally {project.close();}
});
