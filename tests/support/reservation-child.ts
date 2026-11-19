// Hold or publish a real destination reservation so separate processes can race recovery without exposing keys.
import { reserveDestination } from "../../src/runtime/redemption-destination.ts";
const file = process.argv[2];
if (!file) throw new Error("Missing test destination");
try {
  const destination = reserveDestination({ file }, "same-attempt");
  const key = destination.prepare();
  process.send?.({ ready: true });
  const timer = setInterval(() => {}, 1000);
  process.once("message", () => {
    destination.save(new URL("http://localhost"), key);
    destination.close();
    clearInterval(timer);
    process.disconnect();
  });
} catch {
  process.send?.({ ready: false });
  process.disconnect();
}
