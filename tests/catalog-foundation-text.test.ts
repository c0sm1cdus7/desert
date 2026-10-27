// Text: a paragraph in a type role and tone; it absorbs Feedback (support, announced) and MessageBody (body, announced).
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("text: the contract offers a role, weight, tone, alignment, inset, announcement, id and word wrapping, nothing else", async () => {
  assert.deepEqual(await contractShape("text"), {
    text: "text", kind: ["body", "support", "caption"], "weight?": ["regular", "medium"], "tone?": ["default", "muted", "destructive"],
    "align?": ["start", "center", "end"], "inset?": ["none", "row"], "live?": ["off", "polite", "assertive"], "id?": "string",
    "wrap?": ["anywhere", "lines"],
  });
});

// Lane D (slice 3): a name breaks rather than overflow (MediaControl's avatar label) and reading copy keeps its paragraphs (what
// `[data-catalog-prose] p` did for a catalog description).
test("text: wrapping breaks a long word instead of overflowing, and kept lines keep the copy's line breaks", async () => {
  const f = await mounted(`<div data-probe-host style="width:600px">
  <Catalog.Text text={"First paragraph.\\nSecond paragraph."} kind="body" wrap="lines" />
  <Catalog.Text text={"First paragraph.\\nSecond paragraph."} kind="body" />
</div>
<div data-probe-host style="width:60px"><Catalog.Text text="Supercalifragilisticexpialidocious" kind="body" wrap="anywhere" /></div>`);
  try {
    const [kept, collapsed, long] = await f.page.locator("[data-probe-host] > p").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return { whiteSpace: style.whiteSpace, wrap: style.overflowWrap, select: style.userSelect, overflow: node.scrollWidth > node.clientWidth,
        lines: Math.round(node.getBoundingClientRect().height / Number.parseFloat(style.lineHeight)) };
    }));
    // Every paragraph takes the one text policy (wrap-words): a word longer than its line breaks rather than overflow.
    assert.deepEqual([kept?.whiteSpace, kept?.wrap, kept?.select], ["pre-line", "break-word", "text"]);
    assert.deepEqual([kept?.lines, collapsed?.lines], [2, 1], "the line break starts a new line");
    assert.deepEqual([long?.whiteSpace, long?.wrap, long?.overflow], ["normal", "break-word", false]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
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

test("text: an assertive paragraph is an alert; a polite one a status; an unannounced one neither", async () => {
  // Lane B: a control's rejection of what was just written (a duplicate label) is announced at once, as its field error was.
  const f = await mounted(`<div data-probe-host>
  <Catalog.Text text="Rejected" kind="support" tone="destructive" live="assertive" />
  <Catalog.Text text="Saved" kind="support" live="polite" />
  <Catalog.Text text="Plain" kind="support" />
</div>`);
  try {
    assert.deepEqual(await f.page.locator("[data-probe-host] > p").evaluateAll(nodes => nodes.map(node => node.getAttribute("role"))),
      ["alert", "status", null]);
    assert.equal(await f.page.getByRole("alert").textContent(), "Rejected");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
