export function hapticFeedback(event: "drag-start" | "drag-release") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return "unsupported";
  try { return navigator.vibrate(event === "drag-start" ? 8 : 12) ? "requested" : "unavailable"; }
  catch { return "unavailable"; }
}
