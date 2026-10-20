import type { LocalSession } from "../../src/local.ts";

export async function watchNotebook(session: LocalSession) {
  const availability = session.watchAvailability();
  let previous = "";
  availability.subscribe(snapshot => {
    const encoded = JSON.stringify(snapshot);
    if (encoded !== previous) console.log(encoded);
    previous = encoded;
  });
  try {
    await new Promise<void>(resolve => {
      function stop() {
        process.removeListener("SIGINT", stop);
        process.removeListener("SIGTERM", stop);
        resolve();
      }
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
  } finally { availability.dispose(); }
}
