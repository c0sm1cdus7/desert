// Reserve private storage before redemption and preserve a recovered key if publication loses a race.
import {
  lstatSync,
  readFileSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
  renameSync,
  unlinkSync,
  linkSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { isRecord } from "../fields/json-values.ts";
import { doorTexts } from "../texts/doors.texts.ts";
export type RedemptionTarget = Readonly<{ file: string; name?: string }>;
export class RedemptionFailure extends Error {}
function configuration(target: RedemptionTarget): Record<string, unknown> {
  const stat = lstatSync(target.file, { throwIfNoEntry: false });
  if (!stat) return {};
  if (!target.name || !stat.isFile() || stat.isSymbolicLink() || stat.size > 1_048_576) throw new Error("destination");
  const value: unknown = JSON.parse(readFileSync(target.file, "utf8"));
  if (!isRecord(value) || (value.mcpServers !== undefined && !isRecord(value.mcpServers)))
    throw new Error("configuration");
  if (isRecord(value.mcpServers) && Object.hasOwn(value.mcpServers, target.name)) throw new Error("name-conflict");
  return value;
}
class ReservedDestination {
  private readonly file: string;
  private readonly lock: string;
  private readonly recovery: string;
  private readonly target: RedemptionTarget;
  private locked = false;
  private descriptor: number | undefined;
  private saved = false;
  constructor(target: RedemptionTarget) {
    this.target = { ...target, file: resolve(target.file) };
    this.file = this.target.file;
    this.lock = `${this.file}.desert-redemption-lock`;
    this.recovery = join(dirname(this.file), `.desert-redemption-${randomUUID()}`);
    try {
      const fd = openSync(this.lock, "wx", 0o600);
      this.locked = true;
      closeSync(fd);
      configuration(this.target);
      this.descriptor = openSync(this.recovery, "wx", 0o600);
      fsyncSync(this.descriptor);
    } catch {
      this.close();
      throw new RedemptionFailure(doorTexts.destination);
    }
  }
  close() {
    if (this.descriptor !== undefined) {
      closeSync(this.descriptor);
      this.descriptor = undefined;
    }
    if (!this.saved) removeReservation(this.recovery);
    if (this.locked) {
      removeReservation(this.lock);
      this.locked = false;
    }
  }
  save(url: URL, key: string) {
    if (this.descriptor === undefined) throw new Error("closed-reservation");
    // The reserved inode stays writable even when directory permissions change during the exchange.
    writeFileSync(this.descriptor, `${key}\n`);
    fsyncSync(this.descriptor);
    this.saved = true;
    closeSync(this.descriptor);
    this.descriptor = undefined;
    try {
      publish(this.target, this.recovery, url, key);
      this.saved = false;
    } catch {
      throw new RedemptionFailure(doorTexts.recovered(this.recovery));
    }
  }
}
function removeReservation(file: string) {
  try {
    unlinkSync(file);
  } catch {
    /* A changed directory may require the owner to remove the reservation. */
  }
}
function publish(target: RedemptionTarget, recovery: string, url: URL, key: string) {
  const current = configuration(target);
  if (target.name) {
    const servers = isRecord(current.mcpServers) ? current.mcpServers : {};
    url.pathname = "/mcp";
    const content = JSON.stringify(
      {
        ...current,
        mcpServers: {
          ...servers,
          [target.name]: { type: "http", url: url.href, headers: { Authorization: `Bearer ${key}` } },
        },
      },
      null,
      2,
    );
    // No await separates this fresh merge and publication; cooperating processes hold the same lock.
    writeFileSync(recovery, `${content}\n`, { mode: 0o600 });
    const fd = openSync(recovery, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(recovery, target.file);
  } else {
    // Hard-link publication cannot replace a destination created after reservation.
    linkSync(recovery, target.file);
    unlinkSync(recovery);
  }
}
export const reserveDestination = (target: RedemptionTarget) => new ReservedDestination(target);
