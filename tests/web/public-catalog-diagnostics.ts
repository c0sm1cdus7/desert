import assert from "node:assert/strict";
import type { Page, Request } from "playwright";

export function observeDiagnostics(page: Page, expectedCancellation?: (request: Request) => boolean) {
  const pageErrors: string[] = [], consoleErrors: string[] = [], failedRequests: string[] = [], httpErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", request => {
    if (request.failure()?.errorText === 'net::ERR_ABORTED' && expectedCancellation?.(request)) return;
    failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on("response", response => { if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`); });
  return {
    snapshot: () => ({ pageErrors, consoleErrors, failedRequests, httpErrors }),
    assertClean() {
      assert.deepEqual(pageErrors, [], "No uncaught page errors");
      assert.deepEqual(consoleErrors, [], "No browser console errors");
      assert.deepEqual(failedRequests, [], "No failed browser requests");
      assert.deepEqual(httpErrors, [], "No HTTP error responses");
    },
  };
}
