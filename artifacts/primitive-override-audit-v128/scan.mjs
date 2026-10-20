// Read-only source inventory; prints JSON. It does not modify the renderer.
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'svelte/compiler';

const roots = ['src/svelte', 'src/build/svelte', 'products'];
async function filesAt(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesAt(`${path}/${entry.name}`) : `${path}/${entry.name}`))).flat();
}
const files = (await Promise.all(roots.map(filesAt))).flat().sort()
  .filter(path => /\.(svelte|css|ts)$/.test(path));
const sources = [], cssDeclarations = [], componentAttributes = [], runtimeStyles = [], escapeHatches = [];
const parseErrors = [];
const lineAt = (text, offset) => text.slice(0, offset).split('\n').length;
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) for (const child of value) walk(child, visit);
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
for (const path of files) {
  const text = await readFile(path, 'utf8');
  sources.push({ path, sha256: createHash('sha256').update(text).digest('hex') });
  const vendor = path.includes('/vendor/');
  if (path.endsWith('.svelte')) {
    try {
      const ast = parse(text, { modern: true });
      walk(ast.fragment, node => {
        if (node.type !== 'Component' && node.type !== 'SvelteComponent') return;
        for (const attribute of node.attributes ?? []) {
          if (!(attribute.type === 'SpreadAttribute' || attribute.type === 'StyleDirective'
            || attribute.type === 'ClassDirective'
            || (attribute.type === 'Attribute' && ['class', 'style'].includes(attribute.name)))) continue;
          componentAttributes.push({
            path, line: lineAt(text, attribute.start), component: node.name,
            kind: attribute.type === 'Attribute' ? attribute.name : attribute.type,
            vendor, source: text.slice(attribute.start, attribute.end),
          });
        }
      });
      if (ast.css) {
        walk(ast.css, node => {
          if (node.type === 'Rule') cssDeclarations.push({
            path, line: lineAt(text, node.start), vendor,
            source: text.slice(node.start, node.end),
          });
        });
      }
    } catch (error) { parseErrors.push({ path, error: String(error) }); }
  }
  // Retain every CSS source line (including owner definitions), not just a
  // guessed list of forbidden selectors. Classification requires owner review.
  text.split('\n').forEach((source, index) => {
    if (path.endsWith('.css') && source.trim()) {
      cssDeclarations.push({ path, line: index + 1, vendor, source });
    }
    if (/\.style\b|\.style\[|setProperty\(|removeProperty\(|\.animate\(/.test(source)) {
      runtimeStyles.push({ path, line: index + 1, vendor, source });
    }
    if (/class:\s*className|HTML\w*Attributes|ComponentProps<|className\)|\.\.\.(restProps|attributes|props)\}/.test(source)) {
      escapeHatches.push({ path, line: index + 1, vendor, source });
    }
  });
}
const inventory = {
  scope: roots,
  limitations: [
    'Static source inventory, not computed-style or visual regression results.',
    'Entries include owner definitions, legitimate composition and accessibility behavior; not every match is a violation.',
    'Generated builds, historical artifacts, node_modules and test fixture styles are excluded.',
    'No claim that every imported vendor component is reachable in the running product.',
    'Dynamic strings/spreads are recorded as inspection points, not resolved CSS.',
  ],
  counts: {
    sourceFiles: sources.length,
    componentAttributes: componentAttributes.length,
    externalComponentAttributes: componentAttributes.filter(x => !x.vendor).length,
    cssEntries: cssDeclarations.length,
    runtimeStyles: runtimeStyles.length,
    escapeHatches: escapeHatches.length,
    parseErrors: parseErrors.length,
  },
  sources, parseErrors, componentAttributes, cssDeclarations, runtimeStyles, escapeHatches,
};
const section = process.argv[2];
console.log(JSON.stringify(section === 'summary'
  ? { scope: inventory.scope, limitations: inventory.limitations, counts: inventory.counts, parseErrors }
  : section ? inventory[section].slice(Number(process.argv[3] ?? 0), Number(process.argv[3] ?? 0) + 100)
    : inventory));
