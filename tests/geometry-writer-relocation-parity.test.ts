import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { geometryWritersBefore } from "./fixtures/geometry-writers-before.ts";
import { typographyThemeBefore } from "./fixtures/typography-theme-before.ts";
import { controlWritersBefore } from "./fixtures/control-writers-before.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

// The title metrics are the section role now (DESIGN §1.0): the moved writer sets --text-section where it set --text-title.
const messageType = `    --text-section:1.0625rem; --text-section--line-height:1.375rem; --text-section--font-weight:600;
    --text-body:.8125rem; --text-body--line-height:1.1875rem;
`;
const catalogHome = `[data-stack-kind="catalog.home"] { --place-surface-inset:0px; --place-content-inset:1rem; }\n`;
const nestedAfter = `[data-stack-placement="content"] { padding-inline:1rem; }\n`;
const nestedComment = `/* A nested catalog starts at its host's surface guide. Its own group titles
   share the host's reading inset; only horizontal rails retain the outer lane. */\n`;
const leadingInset = `[data-catalog-workspace] [data-slot="sidebar-wrapper"] { --place-leading-inset:0px; }
[data-catalog-workspace] [data-slot="sidebar-wrapper"][data-presentation="docked"][data-state="expanded"] { --place-leading-inset:var(--sidebar-width); }
`;
/** Each relocation reversed inside today's sources: [owner, today's text, text before the move, and the frozen file that
 * held it when that file has moved since (slice 3: place.css's stack rules are stack-item's, catalog-shell.css is shell's)]. */
const reversed: readonly (readonly [string, string, string, string?])[] = [
  ["catalog/mechanisms/surface-reading/surface-reading.css", catalogHome, ""],
  // The nested catalog's featured inset left stack-item.css for catalog-home's `placement` (lane D): the variables return
  // after the content placement, where place.css held them.
  ["catalog/foundations/stack-item/stack-item.css", nestedAfter, `${nestedAfter}${nestedComment}${catalogHome}`, "catalog/foundations/place/place.css"],
  ["catalog/mechanisms/typography/typography.css", `@layer components {\n  [data-frame-presentation="message"] {\n${messageType}  }\n}\n`, ""],
  ["catalog/mechanisms/surface-chrome/surface-chrome.css", `    --chrome-inset:1.5rem;\n  }`, `    --chrome-inset:1.5rem;\n${messageType}  }`],
  ["catalog/mechanisms/theme/base.css", `  button,input,textarea { font:inherit; }\n  h1,h2,h3,p { margin:0; }\n  button { cursor:pointer; }`,
    `  button,input,textarea { font:inherit; } button { cursor:pointer; }`],
  ["catalog/mechanisms/theme/base.css", `  input,textarea { min-width:0; } a {`, `  input,textarea { min-width:0; } h1,h2,h3,p { margin:0; } a {`],
  ["catalog/mechanisms/surface-reading/surface-reading.css", leadingInset, ""],
  ["catalog/foundations/shell/catalog-shell.css", `[data-catalog-workspace] [data-slot="sidebar-wrapper"] { height:100%; min-height:0; }`,
    `[data-catalog-workspace] [data-slot="sidebar-wrapper"] { --place-leading-inset:0px; height:100%; min-height:0; }\n` +
    `[data-catalog-workspace] [data-slot="sidebar-wrapper"][data-presentation="docked"][data-state="expanded"] { --place-leading-inset:var(--sidebar-width); }`,
    "catalog/mechanisms/catalog-shell/catalog-shell.css"],
];

async function previousCss() {
  // Compare ownership of the relocated writers inside today's approved shell.
  // An obsolete whole-theme snapshot would also undo later message heading
  // spacing and toolbar placement, which are not this relocation's contract.
  const base = resolve("src/svelte");
  const frozen: Record<string, string> = { ...geometryWritersBefore, "catalog/mechanisms/theme/base.css": typographyThemeBefore,
    ...Object.fromEntries(Object.entries(controlWritersBefore).map(([path, source]) => [path.slice("src/svelte/".length), source])) };
  const sources = new Map<string, string>();
  for (const [path, today, before, held = path] of reversed) {
    const text = sources.get(path) ?? await readFile(resolve(base, path), "utf8");
    assert.equal(text.split(today).length, 2, `The moved writer is literal and unique in ${path}`);
    if (before) assert.ok(frozen[held]!.replaceAll("--text-title", "--text-section").includes(before), `The prior owner held it there: ${held}`);
    sources.set(path, text.replace(today, before));
  }
  let theme = await readFile(resolve(base, "theme.css"), "utf8");
  for (const [path, source] of sources) {
    const statement = `@import "./${path}";`;
    assert.equal(theme.split(statement).length, 2, `The theme imports ${path} once`);
    theme = theme.replace(statement, source);
  }
  const compiler = await compile(theme, { base, onDependency: () => {} });
  return compiler.build(new Scanner({ sources: compiler.sources }).scan());
}

const source = `<script lang="ts">
  import CatalogHome from '@desert/svelte/catalog/compositions/catalog-home/CatalogHome.svelte';
  import SpecimenRow from '@desert/svelte/catalog/compositions/specimen-row/SpecimenRow.svelte';
  import Problem from '@desert/svelte/catalog/compositions/problem/Problem.svelte';
  let message=$state(false);
  const cssBeforeMount=!!document.querySelector('[data-fixture-initial-css]');
  const card=(record,title)=>({version:'desert.bank-node/1',kind:'catalog.card',presentation:'item',record,title,mediaType:'audio'});
  const home={version:'desert.bank-node/1',kind:'catalog.home',
    featured:{version:'desert.bank-node/1',kind:'catalog.card',presentation:'featured',record:'coast',title:'Shared gallery',eyebrow:'Featured',actionLabel:'Open',mediaType:'audio'},
    groups:[{id:'albums',title:'Albums',items:[card('coast','Coast'),card('mountains','Mountains')]}]};
</script>
<main data-catalog-workspace aria-label="Geometry ownership fixture" data-css-before-mount={cssBeforeMount}>
  <div data-place><h1>Visual catalog</h1>
    <SpecimenRow id="catalog.home" state="populated"><CatalogHome node={home} onevent={()=>{}} /></SpecimenRow>
  </div>
  <button onclick={()=>message=true}>Open message</button>
  <section aria-label="Typography reset"><h2>Shared labels</h2><h3>Writing</h3><p>Readable text.</p>
    <label for="title">Title</label><input id="title" value="A title" />
    <label for="body">Body</label><textarea id="body">A paragraph.</textarea>
  </section>
  <Problem open={message} title="Controller unavailable" description="Your writing remains here. Try again when the controller is available." close={()=>message=false}/>
</main>`;

test("moving protected geometry and typography writers preserves catalog.home and message styles and pixels", { timeout: 60000 }, async () => {
  const baseline = await svelteBrowser(source,{},undefined,{initialCss:await previousCss()});
  const candidate = await svelteBrowser(source,{},undefined,{initialCss:await rendererCss()});
  try {
    for (const fixture of [baseline,candidate]) assert.equal(await fixture.page.locator('main').getAttribute('data-css-before-mount'),'true');
    assert.deepEqual(baseline.errors,[]); assert.deepEqual(candidate.errors,[]);
    const settle = async (fixture: typeof baseline) => {
      await fixture.page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
      });
    };
    for (const width of [390,1280]) for (const colorScheme of ["light","dark"] as const) {
      for (const f of [baseline,candidate]) {
        await f.page.setViewportSize({ width, height:800 });
        await f.page.emulateMedia({ colorScheme, reducedMotion:"reduce" });
        await settle(f);
      }
      const gallery = async (fixture: typeof baseline) => fixture.page.locator('[data-stack-kind="catalog.home"]').evaluate(element => {
        const style=getComputedStyle(element);
        // The group's rail is its labelled scroll region (Inline) and its title the heading over it (CatalogHome draws no marks).
        const rail=element.querySelector('[role="region"]')!, title=rail.closest('[data-view-item]')!.querySelector('h1,h2,h3,h4,h5')!;
        return { surface:style.getPropertyValue('--place-surface-inset'), content:style.getPropertyValue('--place-content-inset'),
          rail:rail.getBoundingClientRect().toJSON(), title:title.getBoundingClientRect().toJSON(), titlePadding:getComputedStyle(title).paddingInlineStart };
      });
      assert.deepEqual(await gallery(candidate), await gallery(baseline), `${width}/${colorScheme} catalog geometry`);
      const typography = async (fixture: typeof baseline) => fixture.page.locator('h1,h2,h3,p,button,input,textarea').evaluateAll(elements => elements.map(element => {
        const style=getComputedStyle(element);
        return { tag:element.tagName, font:style.font, margin:style.margin, bounds:element.getBoundingClientRect().toJSON() };
      }));
      assert.deepEqual(await typography(candidate),await typography(baseline),`${width}/${colorScheme} inherited type and reset margins`);
      assert.deepEqual(await candidate.page.screenshot(), await baseline.page.screenshot(), `${width}/${colorScheme} catalog pixels`);
      for (const f of [baseline,candidate]) {
        await f.page.getByRole('button',{name:'Open message',exact:true}).click();
        await f.page.getByRole('dialog').waitFor(); await settle(f);
      }
      // The message dialog (DESIGN §7.5): its visible title and sentence name and describe it.
      const message = async (fixture: typeof baseline) => fixture.page.locator('[data-modal-message]').evaluate(element => {
        const dialog=element.closest('[role="dialog"]')!;
        const style=getComputedStyle(element), body=document.getElementById(dialog.getAttribute('aria-describedby')!)!, text=getComputedStyle(body);
        const heading=getComputedStyle(document.getElementById(dialog.getAttribute('aria-labelledby')!)!);
        return { variable:style.getPropertyValue('--text-body--line-height'), font:text.fontSize, line:text.lineHeight,
          title:style.getPropertyValue('--text-section'), titleLine:style.getPropertyValue('--text-section--line-height'),
          titleWeight:style.getPropertyValue('--text-section--font-weight'), bodySize:style.getPropertyValue('--text-body'),
          headingFont:heading.font, headingMargin:heading.margin,
          bounds:element.getBoundingClientRect().toJSON(), body:body.getBoundingClientRect().toJSON() };
      });
      assert.deepEqual(await message(candidate), await message(baseline), `${width}/${colorScheme} message geometry`);
      assert.deepEqual(await candidate.page.screenshot(), await baseline.page.screenshot(), `${width}/${colorScheme} message pixels`);
      for (const f of [baseline,candidate]) {
        await f.page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
        await f.page.getByRole('dialog').waitFor({state:'hidden'}); await settle(f);
      }
    }
    assert.deepEqual(baseline.errors,[]); assert.deepEqual(candidate.errors,[]);
  } finally { await baseline.close(); await candidate.close(); }
});
