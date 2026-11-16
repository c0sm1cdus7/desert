import { afterEach, expect, it, vi } from "vitest";
import { openProgramTerminal } from "./open-terminal.ts";
import { connectTerminal } from "./terminal-client.ts";
import { shopProgram, shopShown } from "../../../tests/support/shop.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
vi.mock("./terminal-client.ts", () => ({ connectTerminal: vi.fn() }));
afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});
it.each([
  socketTexts.denied,
  socketTexts.version(2, 1),
  socketTexts.node("24.1.0", "24.2.0"),
  socketTexts.startFailed,
  socketTexts.startTimeout,
  socketTexts.beforeState,
  socketTexts.frame,
])("opening failure is one catalog line and nonzero exit: %s", async reason => {
  vi.mocked(connectTerminal).mockRejectedValue(new Error(reason));
  const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  await expect(openProgramTerminal("/fixture", "/fixture", "fixture", shopProgram, shopShown)).resolves.toBeUndefined();
  expect(output.mock.calls).toEqual([[`${reason}\n`]]);
  expect(process.exitCode).toBe(1);
});
it("unexpected errors cannot expose a stack, path or thrown text", async () => {
  vi.mocked(connectTerminal).mockRejectedValue(new Error("private failure\n at /fixture/file.ts:1"));
  const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  await expect(openProgramTerminal("/fixture", "/fixture", "fixture", shopProgram, shopShown)).resolves.toBeUndefined();
  expect(output.mock.calls).toEqual([[`${socketTexts.startFailed}\n`]]);
  expect(process.exitCode).toBe(1);
});
