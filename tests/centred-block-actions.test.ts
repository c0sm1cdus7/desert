// A button under a centred block is centred with it (owner decision V4, 2026-10-25: the approved look, in code since the
// slice 3 package): the lock screen's «Use another identity» stands on the axis of the clock, portrait and name above it,
// and an unavailable image's «Retry» on the axis of the sentence it follows. Neither is left-aligned under centred text.
// Light and dark, phone and wide. Writes what it saw to artifacts/centred-block-actions/<CENTRED_EVIDENCE|current>/.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { mounted } from "./support/foundation.ts";

const page = `<div data-case="lock-screen" style="padding:24px"><Catalog.LockScreen profile={{ login: "sample-identity", displayName: "Sample identity", avatarSeed: "0011223344556677" }} onsubmit={async () => {}} /></div>
  <div data-case="image-error" style="padding:24px;max-width:420px"><Catalog.Image source="/media/missing-photo.jpg" alt="Missing photo" retry fallback="Image unavailable" /></div>`;

function read() {
  const centre = (box: DOMRect) => box.left + box.width / 2;
  const lock = document.querySelector('[data-case="lock-screen"]')!, image = document.querySelector('[data-case="image-error"]')!;
  const buttons = [...lock.querySelectorAll("button")].filter(button => button.textContent?.trim() === "Use another identity");
  const heading = lock.querySelector("h1, h2, h3, [data-heading]")!, retry = [...image.querySelectorAll("button")].find(button => button.textContent?.trim() === "Retry");
  const notice = image.querySelector("[data-media-notice]")!, sentence = notice.querySelector("span")!;
  return {
    lock: { button: buttons[0] ? centre(buttons[0].getBoundingClientRect()) : null, heading: centre(heading.getBoundingClientRect()),
      column: centre(heading.parentElement!.getBoundingClientRect()), buttonBelowHeading: buttons[0] ? buttons[0].getBoundingClientRect().top > heading.getBoundingClientRect().bottom : false },
    image: { retry: retry ? centre(retry.getBoundingClientRect()) : null, sentence: centre(sentence.getBoundingClientRect()), notice: centre(notice.getBoundingClientRect()),
      retryBelowSentence: retry ? retry.getBoundingClientRect().top >= sentence.getBoundingClientRect().bottom : false },
  };
}

test("lock screen and image error: the button under a centred block is centred with it", { timeout: 90000 }, async () => {
  const f = await mounted(page);
  const directory = new URL(`../artifacts/centred-block-actions/${process.env.CENTRED_EVIDENCE ?? "current"}/`, import.meta.url);
  const failures: string[] = [], report: unknown[] = [];
  try {
    await mkdir(directory, { recursive: true });
    await f.page.locator('[data-case="image-error"] [data-media-error]').waitFor();
    for (const width of [390, 1280]) for (const colorScheme of ["light", "dark"] as const) {
      await f.page.setViewportSize({ width, height: 900 });
      await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await f.page.waitForTimeout(200);
      await f.page.screenshot({ path: new URL(`centred-${colorScheme}-${width}.png`, directory).pathname, fullPage: true });
      const observed = await f.page.evaluate(read);
      report.push({ width, colorScheme, ...observed });
      const check = (valid: boolean, message: string) => { if (!valid) failures.push(`${width}px ${colorScheme}: ${message}`); };
      check(observed.lock.button !== null && observed.lock.buttonBelowHeading, "the lock screen shows «Use another identity» under its block");
      check(observed.lock.button !== null && Math.abs(observed.lock.button - observed.lock.column) <= 1 && Math.abs(observed.lock.heading - observed.lock.column) <= 1,
        `«Use another identity» stands on the centred block's axis (button ${observed.lock.button}, heading ${observed.lock.heading}, column ${observed.lock.column})`);
      check(observed.image.retry !== null && observed.image.retryBelowSentence, "the image error shows «Retry» under its sentence");
      check(observed.image.retry !== null && Math.abs(observed.image.retry - observed.image.notice) <= 1 && Math.abs(observed.image.sentence - observed.image.notice) <= 1,
        `«Retry» stands on the notice's axis with its sentence (retry ${observed.image.retry}, sentence ${observed.image.sentence}, notice ${observed.image.notice})`);
    }
    await writeFile(new URL("centred.json", directory), JSON.stringify(report, null, 2));
    assert.deepEqual(f.errors, []);
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});
