// Serialize a browser proof solver with a minimal DOM contract; no browser dependency enters the server.
type ConsentForm = {
  addEventListener: (type: string, listener: (event: { preventDefault: () => void }) => Promise<void>) => void;
  querySelector(selector: "button"): { disabled: boolean; textContent: string } | null;
  querySelector(selector: 'input[name="proof"]'): { value: string } | null;
};
type ConsentBrowser = {
  document: { querySelector: (selector: string) => ConsentForm | null };
  FormData: new (form: ConsentForm) => { get: (name: string) => string | null };
  HTMLFormElement: { prototype: { submit: (this: ConsentForm) => void } };
};
function prepareInvitation(browser: ConsentBrowser, failed: string) {
  const form = browser.document.querySelector("form");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    const output = form.querySelector('input[name="proof"]');
    if (!button || !output || button.disabled) return;
    button.disabled = true;
    try {
      const data = new browser.FormData(form);
      const code = String(data.get("invitation"));
      const challenge = data.get("challenge") ?? "";
      const prefix = challenge ? `desert-invitation-work-v2:${challenge}` : "desert-invitation-work-v1";
      const encoder = new TextEncoder();
      for (let proof = 0; proof <= 0xffff_ffff; proof++) {
        const hash = new Uint8Array(
          await crypto.subtle.digest("SHA-256", encoder.encode(`${prefix}:${code}:${proof}`)),
        );
        if (hash[0] !== 0 || hash[1] !== 0) continue;
        output.value = String(proof);
        browser.HTMLFormElement.prototype.submit.call(form);
        return;
      }
    } catch {
      button.textContent = failed;
    }
  });
}
export const invitationScript = () => prepareInvitation.toString();
