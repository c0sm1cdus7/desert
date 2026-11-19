// Reserve private storage before redemption and preserve a recovered key if publication loses a race.
import {
  lstatSync,
  readFileSync,
  openSync,
  writeFileSync,
  fsyncSync,
  writeSync,
  ftruncateSync,
  closeSync,
  renameSync,
  unlinkSync,
  linkSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { redemptionReservation, type RedemptionPhase } from "./redemption-reservation.ts";
import { randomBytes, randomUUID } from "node:crypto";
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
  private reservation: ReturnType<typeof redemptionReservation> | undefined;
  private recovery: string;
  private prepared = false;
  private phase: RedemptionPhase = "reserved";
  private readonly attempt: string;
  private readonly target: RedemptionTarget;
  private descriptor: number | undefined;
  private saved = false;
  constructor(target: RedemptionTarget, attempt: string) {
    this.attempt = attempt;
    this.target = { ...target, file: resolve(target.file) };
    this.file = this.target.file;
    this.recovery = join(dirname(this.file), `.desert-redemption-${randomUUID()}`);
    try {
      this.reservation = redemptionReservation(this.file);
      const previous = this.reservation.recovery;
      if (previous) {
        const stat = lstatSync(previous, { throwIfNoEntry: false });
        if (stat?.size) {
          this.recovery = previous;
          this.prepared = true;
          this.phase = this.reservation.phase;
          requireAttempt(this.reservation.attempt, attempt, this.guidance());
          this.descriptor = openRecovery(this.target, previous, this.guidance());
          return;
        }
        removeReservation(previous);
      }
      configuration(this.target);
      this.descriptor = openSync(this.recovery, "wx", 0o600);
      fsyncSync(this.descriptor);
      this.reservation.record(this.recovery, attempt);
    } catch (error) {
      this.close();
      throw error instanceof RedemptionFailure ? error : new RedemptionFailure(doorTexts.destination);
    }
  }
  close() {
    if (this.descriptor !== undefined) {
      closeSync(this.descriptor);
      this.descriptor = undefined;
    }
    try {
      if (!this.saved && !this.prepared) {
        removeReservation(this.recovery);
        this.reservation?.clear();
      }
    } finally {
      this.reservation?.close();
      this.reservation = undefined;
    }
  }
  prepare() {
    if (this.descriptor === undefined) throw new Error("closed-reservation");
    if (this.prepared) {
      const key = readFileSync(this.recovery, "utf8").trim();
      if (!/^[A-Za-z0-9_-]{43}$/.test(key)) throw new RedemptionFailure(this.guidance());
      return key;
    }
    const key = randomBytes(32).toString("base64url");
    writeFileSync(this.descriptor, `${key}\n`);
    fsyncSync(this.descriptor);
    this.prepared = true;
    return key;
  }
  guidance() {
    const messages = { reserved: doorTexts.pending, uncertain: doorTexts.uncertain, confirmed: doorTexts.confirmed };
    return `${messages[this.phase](this.recovery)} ${doorTexts.resume}`;
  }

  sending() {
    if (this.phase === "confirmed") return;
    this.phase = "uncertain";
    this.reservation?.record(this.recovery, this.attempt, this.phase);
  }
  cancel() {
    this.prepared = false;
  }
  save(url: URL, key: string) {
    if (this.descriptor === undefined) throw new Error("closed-reservation");
    // The reserved inode stays writable even when directory permissions change during the exchange.
    if (readFileSync(this.recovery, "utf8").trim() !== key) {
      writeSync(this.descriptor, `${key}\n`, 0, "utf8");
      ftruncateSync(this.descriptor, key.length + 1);
    }
    fsyncSync(this.descriptor);
    this.phase = "confirmed";
    this.reservation?.record(this.recovery, this.attempt, this.phase);
    this.saved = true;
    closeSync(this.descriptor);
    this.descriptor = undefined;
    try {
      publish(this.target, this.recovery, url, key);
      this.saved = false;
      this.prepared = false;
    } catch {
      throw new RedemptionFailure(this.guidance());
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
    const publication = `${recovery}.publish`;
    removeReservation(publication);
    writeFileSync(publication, `${content}\n`, { mode: 0o600, flag: "wx" });
    const fd = openSync(publication, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(publication, target.file);
    unlinkSync(recovery);
  } else {
    // Hard-link publication cannot replace a destination created after reservation.
    linkSync(recovery, target.file);
    unlinkSync(recovery);
  }
}
export const reserveDestination = (target: RedemptionTarget, attempt = "") => new ReservedDestination(target, attempt);

function openRecovery(target: RedemptionTarget, recovery: string, guidance: string) {
  try {
    configuration(target);
    return openSync(recovery, "r+");
  } catch {
    throw new RedemptionFailure(guidance);
  }
}

function requireAttempt(saved: string | undefined, current: string, guidance: string) {
  if (saved !== current) throw new RedemptionFailure(guidance);
}
