// A remote device's notices for one connection: what each poll carries again until the house answers each one.
import type { DeviceNotice, DeviceNotices, NoticeAnswer } from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import { deviceHttpLimits } from "./device-wire.ts";
export const reasonOf = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
export class NoticeOutbox {
  private readonly notices: DeviceNotices;
  private readonly tell: (reason: string) => void;
  private readonly wake: () => void;
  private readonly owed = new Map<string, DeviceNotice>();
  private fresh = false;
  constructor(notices: DeviceNotices, tell: (reason: string) => void, wake: () => void) {
    this.notices = notices;
    this.tell = tell;
    this.wake = wake;
  }
  /** Hears new notices first, then reads what is still owed from the tools' disk; returns the way to stop hearing. */
  async open(alive: () => boolean): Promise<() => void> {
    const stop = this.notices.subscribe(notice => {
      if (!alive()) return;
      this.owe(notice);
      this.wake();
    });
    try {
      for (const notice of await this.notices.pending()) this.owe(notice);
    } catch (error) {
      // What could not be read stays on disk and is read again on the next connection.
      this.tell(reasonOf(error));
    }
    return stop;
  }
  /** A notice too large for one body travels without its value: the house needs only its status and reference. */
  private owe(notice: DeviceNotice) {
    let kept = notice;
    if (bytes(notice) + 64 > deviceHttpLimits.body) {
      const { value: _value, ...rest } = notice;
      kept = rest;
      this.tell(deviceTexts.noticeTrimmed(notice.execution));
    }
    this.owed.set(notice.execution, kept);
    this.fresh = true;
  }
  /** Whether a notice was born since the last body, so a poll carries it now. */
  ready() {
    return this.fresh;
  }
  /** Every unanswered notice that fits in what the body has left; the rest go in the next poll. */
  offer(used: number): DeviceNotice[] {
    const taken: DeviceNotice[] = [];
    let size = used;
    for (const notice of this.owed.values()) {
      const more = bytes(notice) + 1;
      if (taken.length >= deviceHttpLimits.notices || size + more > deviceHttpLimits.body) break;
      taken.push(notice);
      size += more;
    }
    this.fresh = false;
    return taken;
  }
  /** The house answered: the tool keeps the answer and the notice is not sent again. */
  settle(answered: readonly Readonly<{ execution: string; answer: NoticeAnswer }>[]) {
    for (const { execution, answer } of answered) {
      if (!this.owed.delete(execution)) continue;
      if (answer === "refused") this.tell(deviceTexts.noticeRefused(execution));
      // A failed acknowledgement leaves it pending on disk: the next connection sends it and hears the same answer.
      this.notices.acknowledge(execution, answer).catch((error: unknown) => {
        this.tell(reasonOf(error));
      });
    }
  }
}
