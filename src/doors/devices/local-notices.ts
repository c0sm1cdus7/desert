// A device in the house's own process sends its tools' notices through the link its connection returned.
import type { DeviceLink, DeviceNotice, DeviceNotices, NoticeAnswer } from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import { reasonOf } from "./remote-notices.ts";
/** Sends what is owed and each new notice, and acknowledges every answer, held ones when the house records them. A
 * notice the link could not take stays pending: relaying again after the next connect sends it. Returns the stop. */
export function relayNotices(link: DeviceLink, notices: DeviceNotices, report: (reason: string) => void): () => void {
  let stopped = false;
  const tell = (reason: string) => {
    try {
      report(reason);
    } catch {
      /* A failing reporter never stops the relay. */
    }
  };
  const answered = (execution: string, answer: NoticeAnswer) => {
    if (stopped) return;
    if (answer === "refused") tell(deviceTexts.noticeRefused(execution));
    notices.acknowledge(execution, answer).catch((error: unknown) => {
      tell(reasonOf(error));
    });
  };
  const send = (notice: DeviceNotice) => {
    if (stopped) return;
    try {
      const answer = link.announce(notice, later => answered(notice.execution, later));
      if (answer !== "held") answered(notice.execution, answer);
    } catch (error) {
      tell(reasonOf(error));
    }
  };
  const stop = notices.subscribe(send);
  notices.pending().then(
    owed => owed.forEach(send),
    (error: unknown) => tell(reasonOf(error)),
  );
  return () => {
    stopped = true;
    stop();
  };
}
