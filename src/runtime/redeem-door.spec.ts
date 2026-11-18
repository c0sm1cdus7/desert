// The local entry preserves MCP configuration, enforces private files and never logs returned credentials.
import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { redeemToFile } from "./redeem-door.ts";
import { redeemCommand } from "./redeem-door-cli.ts";
const homes: string[] = [];
const setup = () => {
  const home = mkdtempSync("/tmp/desert-redemption-");
  homes.push(home);
  return home;
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
it.each(["--file", "--claude"])("saves via %s with mode 600 without printing the code or credential", async mode => {
  const file = join(setup(), "configuration.json");
  if (mode === "--claude")
    writeFileSync(
      file,
      JSON.stringify({ theme: "dark", mcpServers: { previous: { type: "http", url: "https://example.invalid/mcp" } } }),
    );
  const material = randomBytes(32).toString("base64url");
  const code = "ABCD-2345";
  const send = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ key: material }))));
  vi.stubGlobal("fetch", send);
  const output: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation(chunk => {
    output.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation(chunk => {
    output.push(String(chunk));
    return true;
  });
  const args = ["https://example.invalid", mode, file, ...(mode === "--claude" ? ["--name", "house"] : [])];
  const input = async function* () {
    yield await Promise.resolve(Buffer.from(`${code}\n`));
  };
  expect(await redeemCommand(args, input())).toBe(0);
  expect(statSync(file).mode & 0o777).toBe(0o600);
  const saved = readFileSync(file, "utf8");
  expect(saved.includes(material)).toBe(true);
  if (mode === "--claude") {
    expect(JSON.parse(saved)).toMatchObject({
      theme: "dark",
      mcpServers: { previous: { type: "http" }, house: { type: "http", url: "https://example.invalid/mcp" } },
    });
  }
  expect(output.some(text => text.includes(material) || text.includes(code))).toBe(false);
  expect(send).toHaveBeenCalledOnce();
});
it("rejects insecure endpoints, malformed configuration and symlink targets before sending a code", async () => {
  const home = setup(),
    file = join(home, "configuration.json");
  const send = vi.fn();
  vi.stubGlobal("fetch", send);
  await expect(redeemToFile("http://example.invalid", "code", { file })).rejects.toThrow();
  writeFileSync(file, "broken");
  await expect(redeemToFile("https://example.invalid", "code", { file, name: "house" })).rejects.toThrow();
  symlinkSync(file, join(home, "link"));
  await expect(
    redeemToFile("https://example.invalid", "code", { file: join(home, "link"), name: "house" }),
  ).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});
it("never prints hostile response errors and preserves the previous configuration on failure", async () => {
  const file = join(setup(), "configuration.json"),
    original = JSON.stringify({ mcpServers: {} });
  writeFileSync(file, original);
  const material = randomBytes(32).toString("base64url");
  vi.stubGlobal("fetch", () => Promise.reject(new Error(material)));
  const output: string[] = [];
  vi.spyOn(process.stderr, "write").mockImplementation(chunk => {
    output.push(String(chunk));
    return true;
  });
  const input = async function* () {
    yield await Promise.resolve(Buffer.from("ABCD-2345"));
  };
  expect(await redeemCommand(["https://example.invalid", "--claude", file, "--name", "house"], input())).toBe(1);
  expect(readFileSync(file, "utf8")).toBe(original);
  expect(output.some(text => text.includes(material))).toBe(false);
});
