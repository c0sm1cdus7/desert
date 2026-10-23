import test from 'node:test';
import assert from 'node:assert/strict';
import { svelteBrowser } from './fixtures/svelte-browser.ts';

test('the native chooser uses installed format filters and removes its hidden host on cancel or selection', async () => {
  const fixture=await svelteBrowser(`<script>
    import {nativeFilePicker} from '@desert/svelte/pieces/native-file-picker.ts';
    let result=$state('untouched');
    const node={version:'desert.control/1',kind:'files',id:'media',label:'Media',disabled:false,files:[],
      limits:{maxCount:1,maxFileBytes:20971520,maxTotalBytes:20971520,accept:['image/jpeg','image/png','image/webp','video/mp4','audio/mpeg','audio/wav']}};
    async function choose(){const files=await nativeFilePicker(node);result=files===null?'cancelled':files.map(file=>file.name).join(',');}
  </script><button onclick={choose}>Add media</button><p role="status">{result}</p>`);
  try {
    const {page}=fixture;
    for(const selection of ['cancel','choose']) {
      const chooserPromise=page.waitForEvent('filechooser');
      await page.getByRole('button',{name:'Add media',exact:true}).click();
      const chooser=await chooserPromise;
      assert.equal(chooser.isMultiple(),false);
      const input=page.locator('input[type="file"]');
      assert.equal(await input.getAttribute('accept'),'image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,audio/wav');
      assert.equal(await input.isVisible(),false,'the host input is not a second rendered import form');
      assert.equal(await page.getByRole('dialog').count(),0);
      if(selection==='cancel') await input.dispatchEvent('cancel');
      else await chooser.setFiles({name:'selected.png',mimeType:'image/png',buffer:Buffer.from('host-only fixture')});
      await page.getByRole('status').filter({hasText:selection==='cancel'?'cancelled':'selected.png'}).waitFor();
      assert.equal(await input.count(),0,'the ephemeral chooser host is always released');
    }
    assert.deepEqual(fixture.errors,[]);
  } finally {await fixture.close();}
});
