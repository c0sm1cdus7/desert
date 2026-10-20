import { Client } from "pg";

// Optional diagnostic preload. Observes errors without adding an error listener.
const emit = Client.prototype.emit;
Client.prototype.emit = function (event: string | symbol, ...args: unknown[]) {
  if (event === "error" && this.listenerCount("error") === 0) {
    console.error("UNGUARDED_PG_CLIENT_ERROR", args[0], new Error("Driver delivery stack").stack);
    if (process.env.DESERT_TRACE_ABORT === "1") process.exit(71);
  }
  return emit.call(this, event, ...args);
};
