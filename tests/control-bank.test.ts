import test from "node:test";
import assert from "node:assert/strict";
import { ControlSpecimens } from "../src/interaction/control-specimens.ts";
import { ResolvedNodes } from "../src/interaction/catalog.ts";
import { controlNode } from "../src/interaction/control-nodes.ts";

test('money and options expose retained, disabled and genuinely constrained specimens', () => {
  const money = ControlSpecimens.find(entry => entry.id === 'control.money')!;
  assert.deepEqual(money.specimens.map(item => item.state), ['empty', 'value', 'disabled', 'constrained', 'loading', 'offline']);
  const options = ControlSpecimens.find(entry => entry.id === 'control.options')!;
  assert.deepEqual(options.specimens.map(item => item.state), ['one', 'many', 'disabled', 'constrained',
    'contextual-selected', 'input-empty', 'input-selected', 'input-multiple', 'loading', 'offline']);
  for (const entry of [money, options]) {
    assert.equal(entry.specimens.find(item => item.state === 'disabled')!.node.disabled, true);
    assert.equal(entry.specimens.find(item => item.state === 'constrained')!.node.disabled, false);
    assert.equal(entry.specimens.find(item => item.state === 'loading')!.node.disabled, true);
  }
  assert.equal(money.specimens.find(item => item.state === 'offline')!.node.disabled, false,
    'a local money draft remains editable offline');
  assert.equal(options.specimens.find(item => item.state === 'offline')!.node.disabled, true,
    'dependent choices are unavailable offline');
});

test("the versioned catalog derives its control inventory from canonical typed specimens", () => {
  const ids = new Set<string>();
  for (const entry of ControlSpecimens) {
    const catalog = ResolvedNodes.entries.find(item => item.id === entry.id)!;
    assert.deepEqual(catalog.states, entry.specimens.map(item => item.state));
    assert.equal(new Set(catalog.states).size, catalog.states.length);
    for (const specimen of entry.specimens) {
      assert.equal(entry.id, `control.${specimen.node.kind}`);
      assert.deepEqual(controlNode(specimen.node), specimen.node);
      assert.equal(ids.has(specimen.node.id), false);
      ids.add(specimen.node.id);
      if (specimen.node.kind === "popover" && specimen.node.locked) {
        assert.ok(specimen.releaseAfterMs && specimen.releaseAfterMs > 0,
          "every isolated locked-popover specimen needs a completion path");
      }
      if (specimen.releaseAfterMs !== undefined) {
        assert.equal(specimen.node.kind, "popover");
        assert.ok(Number.isSafeInteger(specimen.releaseAfterMs) && specimen.releaseAfterMs <= 5000);
      }
    }
  }
});
