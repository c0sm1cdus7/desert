// Merge through checked descriptors and publish only the private inodes reserved by this exchange.
import { closeSync, linkSync, renameSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { isRecord } from "../fields/json-values.ts";
import type { RedemptionTarget } from "./redemption-destination.ts";
import {
  checkName,
  checkPrivate,
  configurationLimit,
  createPrivate,
  openPrivate,
  optionalPrivate,
  readPrivate,
  recoveryLimit,
  removeChecked,
  writePrivate,
} from "./redemption-files.ts";
export function configuration(target: RedemptionTarget): Record<string, unknown> {
  const fd = optionalPrivate(target.file, configurationLimit);
  if (fd === undefined) return {};
  try {
    if (!target.name) throw new Error("destination");
    const value: unknown = JSON.parse(readPrivate(fd, configurationLimit));
    checkName(fd, target.file);
    if (!isRecord(value) || (value.mcpServers !== undefined && !isRecord(value.mcpServers)))
      throw new Error("configuration");
    if (isRecord(value.mcpServers) && Object.hasOwn(value.mcpServers, target.name)) throw new Error("name-conflict");
    return value;
  } finally {
    closeSync(fd);
  }
}
export function publish(
  target: RedemptionTarget,
  recovery: string,
  recovered: number,
  url: URL,
  key: string,
  checkDirectory: () => void,
) {
  checkDirectory();
  const current = configuration(target);
  checkPrivate(recovered, recoveryLimit);
  checkName(recovered, recovery);
  if (target.name) {
    const servers = isRecord(current.mcpServers) ? current.mcpServers : {};
    url.pathname = "/mcp";
    const entry = { type: "http", url: url.href, headers: { Authorization: `Bearer ${key}` } };
    const content = JSON.stringify({ ...current, mcpServers: { ...servers, [target.name]: entry } }, null, 2);
    publishConfiguration(target.file, recovery, content, checkDirectory);
  } else {
    // The containing directory is trusted; an exclusive link preserves atomic publication and refuses conflicts.
    checkDirectory();
    checkName(recovered, recovery);
    linkSync(recovery, target.file);
    try {
      checkName(recovered, target.file);
      checkDirectory();
    } catch (error) {
      removeChecked(recovered, target.file, checkDirectory);
      throw error;
    }
  }
  checkName(recovered, recovery);
  unlinkSync(recovery);
}
function publishConfiguration(file: string, recovery: string, content: string, checkDirectory: () => void) {
  const publication = `${recovery}.${randomUUID()}.publish`;
  const fd = openPrivate(publication, createPrivate, configurationLimit);
  try {
    checkDirectory();
    checkName(fd, publication);
    writePrivate(fd, `${content}\n`, configurationLimit);
    checkDirectory();
    checkName(fd, publication);
    renameSync(publication, file);
    checkName(fd, file);
    checkDirectory();
  } catch (error) {
    removeChecked(fd, file, checkDirectory);
    throw error;
  } finally {
    removeChecked(fd, publication, checkDirectory);
    closeSync(fd);
  }
}
