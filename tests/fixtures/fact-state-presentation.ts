import type { Locator } from "playwright";

export const factCases = [
  { field: "known", label: "Destination", stored: "Lisbon", visible: "Lisbon", state: "known" },
  { field: "empty", label: "Empty value", stored: "", visible: "Empty", state: "empty" },
  { field: "whitespace", label: "Whitespace value", stored: " \t\n ", visible: "Empty", state: "empty" },
  { field: "missing", label: "Missing value", visible: "Unknown", state: "unknown" },
  { field: "zero", label: "Zero value", stored: 0, visible: "0", state: "known" },
  { field: "literalEmpty", label: "Literal Empty", stored: "Empty", visible: "Empty", state: "known" },
  { field: "literalUnknown", label: "Literal Unknown", stored: "Unknown", visible: "Unknown", state: "known" },
  { field: "toString", label: "Inherited name", visible: "Unknown", state: "unknown" },
  { field: "multiline", label: "Notes", stored: "  First line\n\nSecond line  ", visible: "  First line\n\nSecond line  ", state: "known" },
  { field: "long", label: "A long descriptive label which must wrap", stored: "UnbrokenStoredValueThatMustRemainReadableAtNarrowWidths", visible: "UnbrokenStoredValueThatMustRemainReadableAtNarrowWidths", state: "known" },
] as const;

export const storedFacts = Object.fromEntries(factCases.filter(item => "stored" in item).map(item => [item.field, "stored" in item ? item.stored : ""]));
export const informationItems = factCases.map(item => ({ kind: "fact", label: item.label, value: "stored" in item ? String(item.stored) : null }));
export const storedSnapshot = JSON.stringify({ facts: storedFacts, items: informationItems });

export const factStateSource = `<script lang="ts">
  import Facts from "@desert/svelte/Facts.svelte";
  import Information from "@desert/svelte/pieces/Information.svelte";
  const facts = Object.freeze(${JSON.stringify(storedFacts)});
  const fields = ${JSON.stringify(factCases.map(item => item.field))};
  const labels = ${JSON.stringify(Object.fromEntries(factCases.map(item => [`place.${item.field}`, item.label])))};
  const items = Object.freeze(${JSON.stringify(informationItems)}.map(item => Object.freeze(item)));
</script>
<main style="max-width:760px;padding:16px;container-type:inline-size">
  <button data-boundary="before">Before facts</button>
  <section data-consumer="facts" aria-label="Facts consumer">
    <Facts {fields} {facts} {labels} object="place" multiline={["multiline"]}/>
  </section>
  <section data-consumer="information" aria-label="Information consumer">
    <Information {items}/>
  </section>
  <section data-consumer="prose" aria-label="Prose facts consumer">
    <Facts fields={["known","empty","missing"]} {facts} {labels} object="place" multiline={["known","empty","missing"]}/>
  </section>
  <button data-boundary="after">After facts</button>
  <output hidden data-stored>{JSON.stringify({facts,items})}</output>
</main>`;

/** Inspect final rendered text and SVG geometry, without naming an implementation class. */
export async function factVisual(value: Locator, expected: string) {
  return value.evaluate((element, expected) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    // A known-empty value now paints only its dash; measure that visible ink,
    // not the neutral <dd> or the clipped screen-reader explanation.
    let node: Node | null, text: Element = element.querySelector("svg") ?? element;
    while ((node = walker.nextNode())) if (node.textContent === expected && node.parentElement) { text = node.parentElement; break; }
    const style = getComputedStyle(text), row = element.parentElement!, rowStyle = getComputedStyle(row);
    const rect = element.getBoundingClientRect(), rowRect = row.getBoundingClientRect();
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const ancestors: Element[] = [];
    for (let parent: Element | null = text; parent; parent = parent.parentElement) ancestors.unshift(parent);
    context.fillStyle = "white"; context.fillRect(0, 0, 1, 1);
    for (const ancestor of ancestors) {
      context.fillStyle = getComputedStyle(ancestor).backgroundColor; context.fillRect(0, 0, 1, 1);
    }
    const background = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    context.fillStyle = style.color; context.fillRect(0, 0, 1, 1);
    const foreground = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    const luminance = (rgb: number[]) => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0);
    const lights = [luminance(background), luminance(foreground)].sort((a, b) => a - b);
    const contrast = (lights[1]! + .05) / (lights[0]! + .05);
    const glyphs = [...element.querySelectorAll("svg")].map(svg => ({
      shape: svg.innerHTML, hidden: svg.getAttribute("aria-hidden"), width: svg.getBoundingClientRect().width,
      height: svg.getBoundingClientRect().height, animation: getComputedStyle(svg).animationName,
    }));
    return {
      color: style.color, fontSize: parseFloat(style.fontSize), whiteSpace: style.whiteSpace,
      glyphs, text: element.textContent, contrast, background, foreground,
      chrome: { background: rowStyle.backgroundColor, radius: rowStyle.borderRadius, padding: rowStyle.padding, shadow: rowStyle.boxShadow },
      overflow: element.scrollWidth > element.clientWidth + 1 || row.scrollWidth > row.clientWidth + 1,
      inRow: rect.left >= rowRect.left - 1 && rect.right <= rowRect.right + 1,
    };
  }, expected);
}
