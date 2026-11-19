// A synchronous, non-serializable delivery scope belongs only to the verified invitation presenter.
let recipient:
  Readonly<{ invitation: string; deliver: (key: string) => void; material?: string; oauth: boolean }> | undefined;
export function redemptionRecipient(invitation: string) {
  return recipient?.invitation === invitation ? recipient : undefined;
}
export function receiveRedemption(
  invitation: string,
  run: () => boolean,
  supplied?: string,
  oauth = false,
): string | undefined {
  if (recipient) throw new Error("nested-redemption");
  let material: string | undefined;
  recipient = {
    invitation,
    oauth,
    ...(supplied ? { material: supplied } : {}),
    deliver: key => {
      material = key;
    },
  };
  try {
    return run() ? material : undefined;
  } finally {
    recipient = undefined;
  }
}
