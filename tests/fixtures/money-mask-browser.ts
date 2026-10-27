import type { Locator, Page } from "playwright";
import { svelteBrowser } from "./svelte-browser.ts";
import { rendererCss } from "./renderer-css.ts";

const source = `<script>
  import { tick } from "svelte";
  import MoneyControl from "@desert/svelte/catalog/compositions/money-control/MoneyControl.svelte";
  let node = $state({version:'desert.control/1',kind:'money',id:'amount',label:'Amount',disabled:false,
    required:false,currency:'USD',minorUnits:null,currencies:[
      {code:'USD',scale:2,face:{kind:'flag',region:'US'}},
      {code:'ARS',scale:2,face:{kind:'flag',region:'AR'}},
      {code:'EUR',scale:2,face:{kind:'symbol',text:'€'}},{code:'JPY',scale:0}]});
  window.moneyEvents = [];
  window.replaceMoney = async patch => { node = {...node,...patch}; await tick(); };
  window.moneyTick = tick;
</script>
<main style="max-width:640px;padding:24px">
  <MoneyControl {node} onevent={event => {window.moneyEvents.push(event);
    node = {...node,currency:event.currency,minorUnits:event.minorUnits};}} />
</main>`;
type MoneyEvent = { kind: "money.change"; control: string; currency: string; minorUnits: string | null };
type Harness = Window & { moneyEvents: MoneyEvent[]; moneyTick: () => Promise<void>; replaceMoney: (patch: object) => Promise<void> };

export const events = (page: Page) => page.evaluate(() => (window as unknown as Harness).moneyEvents);
export const resetEvents = (page: Page) => page.evaluate(() => { (window as unknown as Harness).moneyEvents = []; });
export const update = (page: Page, patch: object) => page.evaluate(value => (window as unknown as Harness).replaceMoney(value), patch);
export const settle = (page: Page) => page.evaluate(() => (window as unknown as Harness).moneyTick());
export const caret = (input: Locator, start: number, end = start) => input.evaluate((element, range) => {
  (element as HTMLInputElement).focus(); (element as HTMLInputElement).setSelectionRange(range.start, range.end);
}, { start, end });
export const position = (input: Locator) => input.evaluate(element => (element as HTMLInputElement).selectionStart);

/** Simulate the browser input boundary, without modifying the user's clipboard. */
export const paste = (input: Locator, text: string) => input.evaluate((element, value) => {
  const field = element as HTMLInputElement;
  field.focus(); field.select();
  const before = new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertFromPaste", data: value });
  if (field.dispatchEvent(before)) {
    field.setRangeText(value, field.selectionStart!, field.selectionEnd!, "end");
    field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste", data: value }));
  }
}, text);

export async function moneyBrowser(styled = false) {
  const fixture = await svelteBrowser(source);
  if (styled) await fixture.page.addStyleTag({ content: await rendererCss() });
  return { ...fixture, amount: fixture.page.getByRole("textbox", { name: "Amount", exact: true }) };
}
