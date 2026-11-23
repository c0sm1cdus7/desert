// Render escaped house consent with structural HTML and nonce-bound proof code, without external resources.
import { invitationScript } from "./oauth-proof-script.ts";
import { randomBytes } from "node:crypto";
import { languages } from "../../fields/languages.ts";
import { said as inWords, type Text } from "../../fields/phrases.ts";
import { oauthTexts as said } from "../../texts/oauth.texts.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
import type { McpResponse } from "./mcp-access.ts";
const escape = (text: string) => text.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`);
/** Before an invitation names its identity nobody's language is known: the page says each text in every language,
 * each marked with its own. */
function spoken(text: Text): string {
  const each = languages.map(language => [language, inWords(text, language)] as const);
  const distinct = each.filter(([, words], index) => each.findIndex(([, other]) => other === words) === index);
  return distinct.map(([language, words]) => element("span", { lang: language }, escape(words))).join(" · ");
}
/** The same, as plain text: what the page's script says when a code is refused. */
const plain = (text: Text): string => [...new Set(languages.map(language => inWords(text, language)))].join(" · ");
function element(tag: string, attributes: Record<string, string>, content = "") {
  const attrs = Object.entries(attributes).map(([name, value]) => `${name}="${escape(value)}"`);
  const opening = `<${[tag, ...attrs].join(" ")}>`;
  return ["input", "meta"].includes(tag) ? opening : `${opening}${content}</${tag}>`;
}
function consent(params: URLSearchParams, client: string | undefined, challenge: string, nonce: string) {
  const hidden = [...params]
    .filter(([name]) => !["invitation", "proof", "challenge"].includes(name))
    .map(([name, value]) => element("input", { type: "hidden", name, value }))
    .join("");
  const host = new URL(params.get("redirect_uri") ?? "").host;
  return (
    element("p", {}, client === undefined ? spoken(doorTexts.doors.agent) : escape(client)) +
    element("p", {}, spoken(said.returning(host))) +
    element("p", {}, spoken(said.consent)) +
    element(
      "form",
      { method: "post", action: "/authorize" },
      hidden +
        element("input", { type: "hidden", name: "challenge", value: challenge }) +
        element("input", { type: "hidden", name: "proof" }) +
        element(
          "label",
          {},
          spoken(doorTexts.invitationId) +
            element("input", {
              name: "invitation",
              placeholder: "XXXX-XXXX",
              pattern: "[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}",
              required: "",
              autocomplete: "off",
              maxlength: "9",
              spellcheck: "false",
            }),
        ) +
        element("button", {}, spoken(said.enter)),
    ) +
    element("script", { nonce }, `(${invitationScript()})(globalThis,${JSON.stringify(plain(doorTexts.denied))})`)
  );
}
export function oauthPage(status: number, message: Text, params?: URLSearchParams, client?: string, challenge = "") {
  const nonce = randomBytes(24).toString("base64url");
  const response: McpResponse = {
    status,
    headers: pageHeaders(nonce, params?.get("redirect_uri")),
    body:
      ["<!doctype", "html>"].join(" ") +
      element(
        "html",
        {},
        element(
          "head",
          {},
          element("meta", { charset: "utf-8" }) +
            element("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }) +
            element("title", {}, escape(plain(said.title))),
        ) +
          element(
            "body",
            {},
            element(
              "main",
              {},
              element("h1", {}, spoken(said.title)) +
                element("p", {}, spoken(message)) +
                (params ? consent(params, client, challenge, nonce) : ""),
            ),
          ),
      ),
  };
  return response;
}

function pageHeaders(nonce: string, redirect?: string | null) {
  const directives = {
    "default-src": "'none'",
    "script-src": `'nonce-${nonce}'`,
    "form-action": ["'self'", ...(redirect ? [new URL(redirect).origin] : [])].join(" "),
    "frame-ancestors": "'none'",
    "base-uri": "'none'",
  };
  return {
    "Content-Type": ["text/html;", "charset=utf-8"].join(" "),
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": Object.entries(directives)
      .map(parts => parts.join(" "))
      .join("; "),
  };
}
