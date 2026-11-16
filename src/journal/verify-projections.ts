// A checksum proves bytes survived, not that a previous program folded the journal faithfully.
export type FoldAudit<E> = {
  seq: number;
  fold(event: E): void;
  matches(): boolean;
  discard: () => void;
};
export function verifyProjections<E extends { seq: number }>(
  audits: readonly FoldAudit<E>[],
  replay: (visit: (event: E) => void) => void,
): boolean {
  if (audits.some(audit => audit.seq > 0))
    replay(event => {
      for (const audit of audits) if (event.seq <= audit.seq) audit.fold(event);
    });
  let valid = true;
  for (const audit of audits) {
    if (audit.matches()) continue;
    audit.discard();
    valid = false;
  }
  return valid;
}
