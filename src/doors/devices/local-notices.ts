// A device in the house's own process sends its tools' notices through the link its connection returned.
import { meant } from "../../fields/phrases.ts";
import type { DeviceLink, DeviceNotice, EndpointNotices, NoticeAnswer } from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import { reasonOf } from "./remote-notices.ts";
/** A reporter that never throws, and a way to run an observer whose failure is reported instead of thrown. */
function teller(report: (reason: string) => void) {
  const tell = (reason: string) => {
    try {
      report(reason);
    } catch {
      /* A failing reporter never stops the relay. */
    }
  };
  const observe = (hear: () => void) => {
    try {
      hear();
    } catch (error) {
      tell(reasonOf(error));
    }
  };
  return { tell, observe };
}
/** Sends what is owed and each new notice, and acknowledges every answer, held ones when the house records them. A
 * notice the link could not take stays pending: relaying again after the next connect sends it. `written` hears each
 * notice once the house wrote its fact, now or when a held one is recorded. Returns the stop. */
export function relayNotices(
  link: DeviceLink,
  notices: EndpointNotices,
  report: (reason: string) => void,
  written?: (notice: DeviceNotice) => void,
): () => void {
  let stopped = false;
  const { tell, observe } = teller(report);
  const answered = (execution: string, answer: NoticeAnswer) => {
    if (stopped) return;
    if (answer === "refused") tell(meant(deviceTexts.noticeRefused(execution)));
    notices.acknowledge(execution, answer).catch((error: unknown) => {
      tell(reasonOf(error));
    });
  };
  const send = (notice: DeviceNotice) => {
    if (stopped) return;
    try {
      // A failing observer never undoes an answer: the fact is written, so the notice is still acknowledged.
      const heard = written && (() => observe(() => written(notice)));
      const answer = link.announce(notice, later => answered(notice.execution, later), heard);
      if (answer !== "held") answered(notice.execution, answer);
    } catch (error) {
      tell(reasonOf(error));
    }
  };
  const stop = notices.subscribe(send, tell);
  notices.pending(tell).then(
    owed => owed.forEach(send),
    (error: unknown) => tell(reasonOf(error)),
  );
  return () => {
    stopped = true;
    stop();
  };
}
