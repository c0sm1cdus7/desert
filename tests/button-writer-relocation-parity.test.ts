import assert from "node:assert/strict";
import test from "node:test";
import { compile as compileSvelte } from "svelte/compiler";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { buttonWritersBefore } from "./fixtures/button-writers-before.ts";
import { controlWritersBefore } from "./fixtures/control-writers-before.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const buttonPath = "src/svelte/vendor/components/ui/button/button.svelte";
const source = `<script lang="ts">
  import { Button } from '@desert/svelte/vendor/components/ui/button/index.js';
  import Toolbar from '@desert/svelte/pieces/Toolbar.svelte';
  import CatalogToolbar from '@desert/svelte/explorer/CatalogToolbar.svelte';
  import * as Sidebar from '@desert/svelte/vendor/components/ui/sidebar/index.js';
  let query=$state(''),searching=$state(false);
  const cssBeforeMount=!!document.querySelector('[data-fixture-initial-css]');
  const actions=[{intent:{kind:'journey',journey:'edit'},label:'Edit',icon:'edit',state:'ready'},
    {intent:{kind:'journey',journey:'archive'},label:'Archive',icon:'archive',state:'ready'}];
</script>
<main data-renderer-profile="apple-reference" data-catalog-workspace data-css-before-mount={cssBeforeMount}>
  <Sidebar.Provider>
    <CatalogToolbar title="Notes" {query} {searching} resultsId="results" onquery={value=>query=value}
      onsearch={()=>searching=true} oncancel={()=>{searching=false;query='';}}/>
    <div data-catalog-scroll>
      <Toolbar toolbar={{edge:'top',title:'Shared toolbar',subtitle:'One button owner',trailing:actions}} invoke={()=>{}}/>
      <section aria-label="Button states">
        <Button>Save note</Button><Button variant="outline">Close</Button>
        <Button variant="destructive">Delete</Button><Button disabled>Unavailable</Button>
        <Button variant="row">A readable row with a longer label</Button>
        <Button href="#results" variant="link">View results</Button>
      </section>
      <section id="results" aria-label="Search results"><p>Writing remains visible.</p></section>
    </div>
  </Sidebar.Provider>
</main>`;

async function previousCss() {
  // Compare ownership of the eight relocated rules inside today's approved
  // shell. An obsolete whole-theme snapshot would also undo new toolbar
  // placement and heading spacing, which are not this regression's contract.
  const original = buttonWritersBefore["src/svelte/theme.css"] + controlWritersBefore["src/svelte/explorer/catalog-search.css"];
  const rules = [
    '[data-slot="button"]', '[data-button-content]', '[data-catalog-search-toggle]',
    '[data-catalog-search-toggle] [data-button-content]', '[data-catalog-search-toggle] svg',
    '[data-catalog-search-toggle] [data-search-icon="close"]',
    '[data-catalog-search-actions][data-expanded="true"] [data-search-icon="open"]',
    '[data-catalog-search-actions][data-expanded="true"] [data-search-icon="close"]',
  ].map(selector => {
    const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const match=original.match(new RegExp(escaped+"\\s*\\{([^{}]*)\\}"));
    assert.ok(match, `Frozen rule exists: ${selector}`);
    return `${selector} {${match[1]}}`;
  });
  return `${await rendererCss()}\n@layer components {${rules.slice(0,2).join('\n')}}\n${rules.slice(2).join('\n')}`;
}

test("moving control writers preserves exact markup, declarations and computed geometry in one unchanged DOM", { timeout: 60000 }, async () => {
  const current=await readFile(buttonPath,"utf8");
  assert.equal(current.replace(/<style>[\s\S]*?<\/style>/g,"").trim(),buttonWritersBefore[buttonPath].trim(),
    "Only CSS ownership changed; the Button script and markup are byte-identical");
  const style=current.match(/<style>([\s\S]*?)<\/style>/)![1]!;
  const originalRules=buttonWritersBefore["src/svelte/theme.css"]+controlWritersBefore["src/svelte/explorer/catalog-search.css"];
  const rules=[...style.matchAll(/:global\(([^)]+)\)\s*\{([^{}]*)\}/g)];
  assert.equal(rules.length,8,"The two geometry rules and six search feedback rules moved literally");
  for(const [,selector,declarations] of rules){
    const escaped=selector!.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const original=originalRules.match(new RegExp(escaped+"\\s*\\{([^{}]*)\\}"));
    assert.ok(original,selector+" existed in the frozen ownership snapshot");
    assert.equal(declarations!.replace(/\s+/g,""),original[1]!.replace(/\s+/g,""),selector+" exact declarations");
  }
  assert.match(style,/^\s*@layer components\s*\{\s*:global\(\[data-slot="button"\]\)/);
  assert.match(style,/gap:inherit;\s*\}\s*\}\s*:global\(\[data-catalog-search-toggle\]\)/,
    "Geometry remains in components; search rules retain their original unlayered cascade");
  const css={before:await previousCss(),after:await rendererCss()};
  const buttonCss=compileSvelte(current,{filename:resolve(buttonPath),generate:"client",css:"external"}).css!.code;
  const fixture=await svelteBrowser(source,{[resolve(buttonPath)]:buttonWritersBefore[buttonPath]},undefined,{initialCss:css.before});
  try {
    const {page}=fixture;
    assert.equal(await page.locator('main').getAttribute('data-css-before-mount'),'true');
    const ownerStyle=await page.addStyleTag({content:buttonCss});
    const settle=()=>page.evaluate(async()=>{
      await document.fonts.ready;
      await new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));
      await Promise.all(document.getAnimations().filter(animation=>{
        const end=animation.effect?.getComputedTiming().endTime;
        return typeof end==='number'&&Number.isFinite(end);
      }).map(animation=>animation.finished.catch(()=>{})));
      await new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));
    });
    const use=async(version:"before"|"after")=>{
      await page.locator('[data-fixture-initial-css]').evaluate((element,value)=>element.textContent=value,css[version]);
      await ownerStyle.evaluate((element,disabled)=>(element as HTMLStyleElement).disabled=disabled,version==="before");
      await settle();
    };
    const geometry=()=>page.locator('[data-slot="button"],[data-button-content],[data-search-field]').evaluateAll(elements=>elements.map(element=>{
      const style=getComputedStyle(element),range=document.createRange();range.selectNodeContents(element);
      return {bounds:element.getBoundingClientRect().toJSON(),textBounds:range.getBoundingClientRect().toJSON(),
        minHeight:style.minHeight,position:style.position,display:style.display,width:style.width,minWidth:style.minWidth,
        direction:style.flexDirection,align:style.alignItems,justify:style.justifyContent,gap:style.gap,font:style.font,
        color:style.color,background:style.background,border:style.border,shadow:style.boxShadow,transform:style.transform,
        transition:style.transition,outline:style.outline,outlineOffset:style.outlineOffset};
    }));
    for(const width of [390,1280])for(const colorScheme of ["light","dark"] as const){
      await page.setViewportSize({width,height:800});
      await page.emulateMedia({colorScheme,reducedMotion:"reduce"});
      const compare=async(state:string)=>{
        await use("before");const expectedStyles=await geometry();
        await use("after");const actualStyles=await geometry();
        const label=width+"/"+colorScheme+"/"+state;
        assert.deepEqual(actualStyles,expectedStyles,label+" computed geometry and paint");
      };
      await compare("closed");
      await page.getByRole("button",{name:"Search",exact:true}).click();
      await page.getByRole("searchbox").fill("A shared query");
      await compare("search-writing");
      await page.getByRole("button",{name:"Clear search",exact:true}).click();
      await compare("search-cleared");
      await page.getByRole("button",{name:"Close search",exact:true}).click();
    }
    for(const reducedMotion of ["no-preference","reduce"] as const){
      await page.emulateMedia({reducedMotion});
      const motion=()=>page.locator('[data-slot="button"],[data-button-content],[data-search-icon]').evaluateAll(elements=>elements.map(element=>{
        const style=getComputedStyle(element);
        return {transition:style.transition,transform:style.transform,opacity:style.opacity,shadow:style.boxShadow};
      }));
      await use("before");const expected=await motion();await use("after");
      assert.deepEqual(await motion(),expected,reducedMotion+" shared feedback and search transition declarations");
    }
    assert.deepEqual(fixture.errors,[]);
  }finally{await fixture.close();}
});
