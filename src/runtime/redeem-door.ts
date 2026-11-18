// Redeem on the person's machine and atomically persist a credential without displaying it.
import {
  lstatSync,
  readFileSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { isRecord } from "../fields/json-values.ts";
import { doorTexts } from "../texts/doors.texts.ts";
export type RedemptionTarget = Readonly<{ file: string; name?: string }>;
export function redemptionUrl(address: string): URL {
  const url = new URL(address);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password)
    throw new Error(doorTexts.secure);
  url.pathname = "/door/invitations/redeem";
  url.search = "";
  url.hash = "";
  return url;
}
function existingConfiguration(target: RedemptionTarget): Record<string, unknown> {
  const stat = lstatSync(target.file, { throwIfNoEntry: false });
  if (!stat) return {};
  if (!target.name || !stat.isFile() || stat.isSymbolicLink() || stat.size > 1_048_576)
    throw new Error(doorTexts.failed);
  const value: unknown = JSON.parse(readFileSync(target.file, "utf8"));
  if (!isRecord(value) || (value.mcpServers !== undefined && !isRecord(value.mcpServers)))
    throw new Error(doorTexts.failed);
  return value;
}
function writeCredential(target: RedemptionTarget, configuration: Record<string, unknown>, url: URL, key: string) {
  const temporary = join(dirname(target.file), `.desert-redemption-${randomUUID()}`);
  const fd = openSync(temporary, "wx", 0o600);
  try {
    url.pathname = "/mcp";
    const servers = isRecord(configuration.mcpServers) ? configuration.mcpServers : {};
    const content = target.name
      ? JSON.stringify(
          {
            ...configuration,
            mcpServers: {
              ...servers,
              [target.name]: {
                type: "http",
                url: url.href,
                headers: { Authorization: `Bearer ${key}` },
              },
            },
          },
          null,
          2,
        )
      : key;
    writeFileSync(fd, `${content}\n`);
    fsyncSync(fd);
    closeSync(fd);
    renameSync(temporary, target.file);
  } catch {
    try {
      closeSync(fd);
    } catch {
      /* The descriptor may already be closed. */
    }
    try {
      unlinkSync(temporary);
    } catch {
      /* Nothing remains after a completed rename. */
    }
    throw new Error(doorTexts.failed);
  }
}
export async function redeemToFile(address: string, code: string, target: RedemptionTarget): Promise<void> {
  const url = redemptionUrl(address);
  const configuration = existingConfiguration(target);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(doorTexts.denied);
  const value: unknown = await response.json();
  if (!isRecord(value) || typeof value.key !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value.key))
    throw new Error(doorTexts.denied);
  writeCredential(target, configuration, url, value.key);
}
