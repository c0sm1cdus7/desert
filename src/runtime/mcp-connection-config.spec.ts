// Configuration lookup uses only temporary fixtures and keeps credentials and malformed contents out of diagnostics.
import { meant } from "../fields/phrases.ts";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { readMcpConnection } from "./mcp-connection-config.ts";
import { socketTexts } from "../texts/socket.texts.ts";
const homes: string[] = [];
afterEach(() => {
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
  vi.restoreAllMocks();
});
function fixture() {
  const home = mkdtempSync(join(tmpdir(), "mcp-config-test-"));
  homes.push(home);
  const projectDirectory = join(home, "project");
  mkdirSync(projectDirectory);
  return { projectDirectory, userFile: join(home, "user.json"), projectFile: join(projectDirectory, ".mcp.json") };
}
const server = (key: string, url = "https://house.invalid/mcp") => ({
  type: "http",
  url,
  headers: { Authorization: `Bearer ${key}` },
});
const save = (file: string, value: unknown) => writeFileSync(file, JSON.stringify(value), { mode: 0o600 });
it("prefers the project entry written by redemption and never reads or prints the user fallback", () => {
  const f = fixture();
  save(f.projectFile, { mcpServers: { void: server("synthetic-project-key") } });
  writeFileSync(f.userFile, "invalid user data");
  const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const errors = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  expect(readMcpConnection("void", f)).toEqual({ url: "https://house.invalid/mcp", key: "synthetic-project-key" });
  expect(output).not.toHaveBeenCalled();
  expect(errors).not.toHaveBeenCalled();
});
it("falls back through the user project scope and the user MCP servers", () => {
  const f = fixture();
  save(f.projectFile, { mcpServers: { another: server("synthetic-other") } });
  save(f.userFile, { mcpServers: { void: server("synthetic-user") } });
  expect(readMcpConnection("void", f).key).toBe("synthetic-user");
  save(f.userFile, {
    projects: { [f.projectDirectory]: { mcpServers: { void: server("synthetic-scoped") } } },
    mcpServers: { void: server("synthetic-user") },
  });
  expect(readMcpConnection("void", f).key).toBe("synthetic-scoped");
});
it.each([
  [{}, socketTexts.configMissing],
  [{ mcpServers: { void: {} } }, socketTexts.configUrl],
  [{ mcpServers: { void: { url: "https://house.invalid/mcp" } } }, socketTexts.configKey],
  [{ mcpServers: { void: server("synthetic", "http://external.invalid") } }, socketTexts.configUrl],
  [{ mcpServers: { void: server("synthetic", "https://user:synthetic@house.invalid") } }, socketTexts.configUrl],
])("reports missing configuration fields without values: %j", (config, message) => {
  const f = fixture();
  save(f.projectFile, config);
  expect(() => readMcpConnection("void", f)).toThrow(meant(message));
});
it("hides malformed configuration contents and does not silently choose another identity", () => {
  const f = fixture();
  writeFileSync(f.projectFile, "synthetic-private-payload{");
  save(f.userFile, { mcpServers: { void: server("synthetic-user") } });
  expect(() => readMcpConnection("void", f)).toThrow(meant(socketTexts.configInvalid));
});
