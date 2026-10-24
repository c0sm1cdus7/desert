// Text: a paragraph in a type role and tone; it absorbs Feedback (support, announced) and MessageBody (body, announced).
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("text: the contract offers a role, weight, tone, alignment, inset, announcement and id, nothing else", async () => {
  assert.deepEqual(await contractShape("text"), {
    text: "text", kind: ["body", "support", "caption"], "weight?": ["regular", "medium"], "tone?": ["default", "muted", "destructive"],
    "align?": ["start", "center", "end"], "inset?": ["none", "row"], "live?": ["off", "polite"], "id?": "string",
  });
});

test("text: every kind × tone has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("text"), []);
});

test("text: roles, weight and tones are the theme's; a polite paragraph is a status; Feedback and MessageBody are reproduced", async () => {
  const f = await mounted(`<div data-probe-host style="width:400px">
  <Catalog.Text text="Body" kind="body" inset="row" />
  <Catalog.Text text="Support" kind="support" live="polite" />
  <Catalog.Text text="Caption" kind="caption" tone="muted" align="center" />
  <Catalog.Text text="Medium" kind="body" weight="medium" tone="destructive" id="message" />
  <Catalog.Feedback text="Saved" />
  <Catalog.MessageBody content={{ kind: "message", text: "Removed" }} />
</div>`);
  try {
    const paragraphs = await f.page.locator("[data-probe-host] > p").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node), ink = (name: string) => {
        const probe = document.createElement("i"); probe.style.color = `var(${name})`; document.body.append(probe);
        const value = getComputedStyle(probe).color; probe.remove(); return value;
      };
      return { size: style.fontSize, line: style.lineHeight, weight: style.fontWeight, padding: style.paddingLeft, align: style.textAlign,
        role: node.getAttribute("role"), id: node.id, muted: style.color === ink("--muted-foreground"), foreground: style.color === ink("--foreground") };
    }));
    assert.deepEqual(paragraphs.slice(0, 4), [
      { size: "13px", line: "18px", weight: "400", padding: "16px", align: "start", role: null, id: "", muted: false, foreground: true },
      { size: "13px", line: "18px", weight: "400", padding: "0px", align: "start", role: "status", id: "", muted: false, foreground: true },
      { size: "11px", line: "16px", weight: "400", padding: "0px", align: "center", role: null, id: "", muted: true, foreground: false },
      { size: "13px", line: "18px", weight: "500", padding: "0px", align: "start", role: null, id: "message", muted: false, foreground: false },
    ]);
    const feedback = { ...paragraphs[1], id: "" }, message = { ...paragraphs[0], padding: "0px", role: "status" };
    assert.deepEqual(paragraphs[4], feedback, "Feedback is Text(support, live polite)");
    assert.deepEqual(paragraphs[5], message, "MessageBody is Text(body, align start, live polite)");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
