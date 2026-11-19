// Read only the selected MCP entry, preferring project configuration and returning credentials without output.
import { readFileSync, lstatSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { isRecord } from "../fields/json-values.ts";
import { socketTexts } from "../texts/socket.texts.ts";
import { remoteAddress } from "./remote-address.ts";
type ConfigPaths = Readonly<{ projectDirectory?: string; userFile?: string }>;
function read(file: string): Record<string, unknown> | undefined {
  try {
    const stat = lstatSync(file, { throwIfNoEntry: false });
    if (!stat) return undefined;
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1_048_576) throw new Error();
    const value: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (!isRecord(value)) throw new Error();
    return value;
  } catch {
    throw new Error(socketTexts.configInvalid);
  }
}
function entry(config: unknown, name: string): unknown {
  return isRecord(config) && isRecord(config.mcpServers) && Object.hasOwn(config.mcpServers, name)
    ? config.mcpServers[name]
    : undefined;
}
function connection(value: unknown): Readonly<{ url: string; key: string }> {
  if (!isRecord(value) || typeof value.url !== "string") throw new Error(socketTexts.configUrl);
  try {
    remoteAddress(value.url);
  } catch {
    throw new Error(socketTexts.configUrl);
  }
  const headers = isRecord(value.headers) ? value.headers : {};
  const found = Object.entries(headers).filter(([name]) => name.toLowerCase() === "authorization");
  const authorization = found.length === 1 ? found[0]?.[1] : undefined;
  const key = typeof authorization === "string" ? /^Bearer ([^\s]+)$/i.exec(authorization)?.[1] : undefined;
  if (!key) throw new Error(socketTexts.configKey);
  return { url: value.url, key };
}
export function readMcpConnection(name: string, paths: ConfigPaths = {}): Readonly<{ url: string; key: string }> {
  if (!name.trim()) throw new Error(socketTexts.configMissing);
  const project = resolve(paths.projectDirectory ?? process.cwd());
  const local = entry(read(join(project, ".mcp.json")), name);
  if (local !== undefined) return connection(local);
  const user = read(paths.userFile ?? join(homedir(), ".claude.json"));
  const scoped = isRecord(user?.projects) ? entry(user.projects[project], name) : undefined;
  const value = scoped ?? entry(user, name);
  if (value === undefined) throw new Error(socketTexts.configMissing);
  return connection(value);
}
