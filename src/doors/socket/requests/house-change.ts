// Una espera observa la secuencia de la casa y libera su escucha al cambiar, vencer o cerrarse la puerta.
export function houseChange(
  sequence: () => number,
  watch: (changed: () => void) => () => void,
  since: number,
  milliseconds: number,
  signal: AbortSignal,
): Promise<{ seq: number; change: boolean }> {
  return new Promise(resolve => {
    let stop = () => {};
    const finish = () => {
      stop();
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      const seq = sequence();
      resolve({ seq, change: seq > since });
    };
    stop = watch(() => {
      if (sequence() > since) finish();
    });
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", finish, { once: true });
    if (sequence() > since || signal.aborted) finish();
  });
}
