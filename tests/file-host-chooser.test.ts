// The file host opens no chooser itself (infra owns no DOM): the browser's chooser is the file-picker mechanism of the files
// foundation, offered to the host by the shell; the create-from-file journey picks through whichever chooser is offered.
import assert from "node:assert/strict";
import test from "node:test";
import { LocalFileHost } from "../src/svelte/infra/file-host.ts";
import type { FileNode } from "../src/interaction/control-nodes.ts";

const node: FileNode = { version: "desert.control/1", kind: "files", id: "image", label: "Image", disabled: false, files: [],
  limits: { accept: ["image/png"], maxCount: 1, maxFileBytes: 1024, maxTotalBytes: 1024 } };

test("pick without an offered chooser fails loudly instead of touching the document", async () => {
  await assert.rejects(new LocalFileHost().pick(node), /^Error: FILE_PICKER_UNAVAILABLE/);
});

test("pick opens the offered chooser, keeps the chosen handle, and stops using a released chooser", async () => {
  const host = new LocalFileHost(), file = new File(["x"], "a.png", { type: "image/png" });
  const release = host.offerChooser(async offered => { assert.equal(offered, node); return [file]; });
  const event = await host.pick(node);
  assert.equal(event?.kind, "files.choose");
  assert.equal(event?.files[0]?.name, "a.png");
  assert.equal(host.resolve(event?.files[0]?.id ?? ""), file);
  release();
  await assert.rejects(host.pick(node), /^Error: FILE_PICKER_UNAVAILABLE/);
});

test("a cancelled chooser picks nothing", async () => {
  const host = new LocalFileHost();
  host.offerChooser(async () => null);
  assert.equal(await host.pick(node), null);
});
