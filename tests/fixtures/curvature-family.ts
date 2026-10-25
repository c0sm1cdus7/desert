// Design §7.1 radius exception (law 9d, slice 3): one curvature family changed exactly the corners of controls (12px),
// wells (16px), tag chips, lines and the concentric containers around them. Parity tests against frozen bases set the
// corner radius aside, and only it; tests/curvature-family.test.ts measures every corner against the law instead.

/** `value` with every border radius it measured removed (a computed style's `border-radius` or a probe's `radius`). */
export function withoutRadius<Value>(value: Value): Value {
  return JSON.parse(JSON.stringify(value), (key, item) => /^(border-radius|radius|border(-[a-z]+){2}-radius)$/.test(key) ? undefined : item) as Value;
}

/** For a pixel comparison: both sides drawn with square corners, so the comparison sees every pixel but a corner's curve. */
export const squareCorners = "*,*::before,*::after{border-radius:0!important}";
