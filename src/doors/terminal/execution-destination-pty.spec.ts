// Selects execution destinations with a real PTY, including backtracking and disconnected devices.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "../../checks/real-terminal.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
function fixture(mode: string) {
  const home = mkdtempSync(join(tmpdir(), "destination-terminal-"));
  const terminal = realTerminal(
    [process.execPath, join(import.meta.dirname, "../../../tests/support/destination-terminal-open.ts"), home, mode],
    { cols: 140, rows: 40 },
  );
  return {
    home,
    terminal,
    result: (): unknown => JSON.parse(readFileSync(join(home, "result.json"), "utf8")),
    close: async () => {
      await terminal.close();
      rmSync(home, { recursive: true, force: true });
    },
  };
}
it.each([
  { mode: "either", key: "c", destination: "Casa", received: [], sales: 1 },
  { mode: "either", key: "2", destination: "vm (vm)", received: ["vm"], sales: 0 },
  { mode: "device", key: "1", destination: "mac (mac)", received: ["mac"], sales: 0 },
])(
  "dispatches exactly the destination chosen in $mode with key $key",
  async ({ mode, key, destination, received, sales }) => {
    const f = fixture(mode);
    try {
      await f.terminal.until("[v] ventas");
      f.terminal.press("vrs1\r1500\r");
      const choices = (await f.terminal.until(deviceTexts.choose)).join("\n");
      expect(choices).toContain("mac (mac)");
      expect(choices).toContain("vm (vm)");
      expect(choices).not.toContain("old (old)");
      if (mode === "device") expect(choices).not.toContain("[c] Casa");
      f.terminal.press(key);
      await f.terminal.until(deviceTexts.confirm(destination));
      f.terminal.press("\x1b");
      await f.terminal.until(deviceTexts.choose);
      f.terminal.press("\r");
      await f.terminal.until(deviceTexts.confirm(destination));
      f.terminal.press("\r");
      await f.terminal.until(sales ? "Registrada" : "La ejecución terminó");
      await f.terminal.close();
      expect(f.result()).toMatchObject({
        received,
        sales,
        destinations: [sales ? { kind: "house" } : { kind: "device", device: received[0] }],
      });
    } finally {
      await f.close();
    }
  },
  15000,
);
it("runs a house-only action without asking for a device", async () => {
  const f = fixture("house");
  try {
    await f.terminal.until("[v] ventas");
    f.terminal.press("vrs1\r1500\r");
    await f.terminal.until("Registrada");
    expect(f.terminal.written()).not.toContain(deviceTexts.choose);
    await f.terminal.close();
    expect(f.result()).toMatchObject({ sales: 1, received: [] });
  } finally {
    await f.close();
  }
}, 15000);
it("explains the absence of compatible connected devices without executing", async () => {
  const f = fixture("none");
  try {
    await f.terminal.until("[v] ventas");
    f.terminal.press("vrs1\r1500\r");
    await f.terminal.until(deviceTexts.none);
    await f.terminal.close();
    expect(f.result()).toMatchObject({ sales: 0, received: [], destinations: [] });
  } finally {
    await f.close();
  }
}, 15000);
it("does not dispatch a device disconnected between selection and confirmation", async () => {
  const f = fixture("device");
  try {
    await f.terminal.until("[v] ventas");
    f.terminal.press("vrs1\r1500\r");
    await f.terminal.until(deviceTexts.choose);
    f.terminal.press("1");
    await f.terminal.until(deviceTexts.confirm("mac (mac)"));
    writeFileSync(join(f.home, "disconnect"), "disconnect synthetic mac");
    await f.terminal.until(deviceTexts.unavailable);
    f.terminal.press("\r");
    await f.terminal.rest(100);
    await f.terminal.close();
    expect(f.result()).toMatchObject({ sales: 0, received: [], destinations: [] });
  } finally {
    await f.close();
  }
}, 15000);
