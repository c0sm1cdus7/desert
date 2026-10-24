import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

// Explicitly qualified independent owners; content imagery, faces, choice marks,
// scrims, separators and focus/error outlines are deliberately different roles.
const foundation='src/svelte/vendor/components/ui/';
const panes=['button/button','card/card','badge/badge','input-group/input-group','input/input','textarea/textarea',
  'popover/popover-content','dialog/dialog-content','sidebar/sidebar'];
test('S1 role-aware source gate keeps pane recipes out of foundation variants',async()=>{
  for(const path of panes) {
    const source=await readFile(foundation+path+'.svelte','utf8');
    assert.match(source,/data-material/,path+' declares its role');
    assert.doesNotMatch(source,/\bbg-(?!transparent\b|clip-)[\w\[]/,path+' cannot own a filled background');
    assert.doesNotMatch(source,/\bbackdrop-(?:blur|saturate|brightness)/,path+' cannot own a filter');
    assert.doesNotMatch(source,/\bshadow-(?!none\b)[\w\[]/,path+' cannot own elevation or inset perimeter');
    assert.doesNotMatch(source,/(?:disabled|aria-disabled)[^\s"]*:opacity-/,path+' cannot dim a pane');
  }
});

test('S1 role-aware source gate protects neutral geometry owners and permits semantic ink',async()=>{
  const rules:Record<string,readonly string[]>={
    'catalog/foundations/field-well/field-well.css':['@field-well'],
    'catalog/mechanisms/structured-content/structured-content.css':['@grouped-panel','.bank-stack'],
    'catalog/mechanisms/anchored-surface/anchored-surface.css':['.floating-pane','.anchored-surface','.selection-surface'],
    'catalog/mechanisms/surface-chrome/surface-chrome.css':['.drawer','.drawer,.problem',':is(.drawer,.problem,.centered-dialog)'],
    'catalog/mechanisms/catalog-shell/catalog-shell.css':['[data-catalog-workspace] [data-slot="sidebar-inner"]'],
    'catalog/mechanisms/catalog-search/catalog-search.css':['[data-catalog-search-actions] [data-slot="input-group"]','[data-catalog-search] [data-slot="input-group"]'],
    'catalog/mechanisms/control-feedback/control-feedback.css':['@tm-control'],
    'theme.css':['@tm-tinted'],
  };
  const forbidden=/^(?:background(?:-color|-image)?|(?:-webkit-)?backdrop-filter|border(?:-color|-width|-style)?|box-shadow|opacity)$/;
  for(const [file,owners] of Object.entries(rules)) {
    const css=postcss.parse(await readFile('src/svelte/'+file,'utf8'));
    css.walkDecls(declaration=>{
      const parent=declaration.parent;
      const owner=parent?.type==='rule'?parent.selector:parent?.type==='atrule'?'@'+parent.params:'';
      // Presence owns opaque resting endpoints; semantic state never dims a pane.
      if(declaration.prop==='opacity'&&(declaration.value==='1'||/data-starting-style|data-state="closed"/.test(owner))) return;
      let ancestor=parent, stateUtility=false;
      while(ancestor&&ancestor.type!=='root') {
        if(ancestor.type==='atrule'&&['tm-control','tm-tinted'].includes(ancestor.params)) stateUtility=true;
        ancestor=ancestor.parent;
      }
      const targetsOwner=stateUtility||owners.some(target=>owner===target||owner.startsWith(target+':'));
      if(targetsOwner&&forbidden.test(declaration.prop))
        assert.fail(file+': '+owner+' must not own '+declaration.prop);
    });
  }
  const central=await readFile('src/svelte/catalog/mechanisms/pane-material/pane-material.css','utf8');
  assert.equal((central.match(/background-color:var\(--pane-fill\)/g)??[]).length,1);
  assert.equal((central.match(/border:1px solid var\(--pane-border\)/g)??[]).length,1);
});
