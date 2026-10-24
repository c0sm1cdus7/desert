// The one page the owner opens to review: every requested piece with its purpose, its ledger status and the digests an
// approval would stamp, its specimens as thumbnails of the evidence images, and the Visual Catalog pages that show it.
import type { Captured } from "./capture.ts";
import type { EvidencePiece } from "./pieces.ts";
import type { PieceStatus } from "./status.ts";

export type PieceEvidence = Readonly<{ piece: EvidencePiece; status: PieceStatus;
  specimens: ReadonlyMap<number, Captured>; unanswered: readonly string[]; catalog: ReadonlyMap<string, Captured>; excluded: string | undefined }>;
export type IndexInput = Readonly<{ label: string; revision: string; createdAt: string; pieces: readonly PieceEvidence[] }>;

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const href = (...parts: string[]) => parts.map(encodeURIComponent).join("/");
export const catalogFile = (destination: string) => `visual-catalog--${destination}.png`;

function specimenStatus(status: PieceStatus, key: string): string {
  const specimens = "specimens" in status.entry ? status.entry.specimens ?? {} : {};
  return specimens[key] ?? "not stamped";
}

function figure(image: string, caption: string, note: string) {
  return `<figure><a href="${image}"><img loading="lazy" src="${image}" alt="${escape(caption)}"></a>
    <figcaption><code>${escape(caption)}</code><span>${escape(note)}</span></figcaption></figure>`;
}
function missing(caption: string, error: string) {
  return `<figure class="missing"><div>Not rendered</div><figcaption><code>${escape(caption)}</code><span>${escape(error)}</span></figcaption></figure>`;
}

function pieceSection({ piece, status, specimens, unanswered, catalog, excluded }: PieceEvidence): string {
  const list = piece.specimens?.list ?? [];
  const shots = list.map(specimen => {
    const result = specimens.get(specimen.index);
    if (excluded !== undefined) return missing(specimen.key, excluded);
    if (!result || "error" in result) return missing(specimen.key, result && "error" in result ? result.error : "not captured");
    return figure(href(piece.id, specimen.file), specimen.key, specimenStatus(status, specimen.key));
  }).join("");
  const pages = piece.destinations.map(destination => {
    const result = catalog.get(destination.id);
    const caption = [...destination.path, destination.id].join(" › ");
    return !result || "error" in result ? missing(caption, result && "error" in result ? result.error : "not captured")
      : figure(href(piece.id, catalogFile(destination.id)), caption, "Visual Catalog page");
  }).join("");
  const filler = piece.filler ? `<p class="note">Its <code>children</code> slot holds the first specimens of <code>${escape(piece.filler.id)}</code>.</p>` : "";
  return `<section id="${escape(piece.id)}">
  <h2>${escape(piece.id)} <small>${piece.kind}${piece.approval === "required" ? " · approval required" : ""}</small></h2>
  <p>${escape(piece.purpose)}</p>
  <dl><dt>Ledger</dt><dd><code>${escape(status.lines[0] ?? status.entry.status)}</code></dd>
    <dt>Source digest</dt><dd><code>${status.sourceDigest}</code></dd><dt>Contract digest</dt><dd><code>${status.contractDigest}</code></dd>
    <dt>Approve</dt><dd><code>node scripts/catalog.ts approve ${escape(piece.id)}${list.filter(specimen => excluded === undefined && "captures" in (specimens.get(specimen.index) ?? { error: "" })).map(specimen => ` --specimen '${escape(piece.id)}:${escape(specimen.key)}'`).join("")}</code></dd></dl>
  ${filler}
  ${unanswered.length ? `<p class="warn">The build could not answer what its specimens requested: <code>${escape(unanswered.join(", "))}</code>. The renders show what the piece draws then.</p>` : ""}
  ${list.length ? `<h3>Specimens (${list.length})</h3><div class="grid">${shots}</div>` : `<p class="note">No specimens declared.</p>`}
  ${pages ? `<h3>In the Visual Catalog</h3><div class="grid wide">${pages}</div>` : ""}
</section>`;
}

const style = `:root{color-scheme:light dark;--bg:#f5f5f7;--fg:#1d1d1f;--muted:#6e6e73;--card:#fff;--line:#d2d2d7}
@media (prefers-color-scheme:dark){:root{--bg:#000;--fg:#f5f5f7;--muted:#a1a1a6;--card:#1c1c1e;--line:#38383a}}
body{margin:0;padding:24px 16px 64px;background:var(--bg);color:var(--fg);font:15px/1.45 -apple-system,BlinkMacSystemFont,sans-serif}
main{max-width:1400px;margin:0 auto}h1{font-size:28px;margin:0 0 4px}h2{font-size:22px;margin:0}h2 small{font-size:13px;color:var(--muted);font-weight:400}
h3{font-size:15px;margin:20px 0 8px}section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;margin:16px 0}
.note,figcaption span,header p{color:var(--muted)}code{font:12px ui-monospace,Menlo,monospace;overflow-wrap:anywhere}
dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:12px 0}dt{color:var(--muted)}dd{margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.grid.wide{grid-template-columns:repeat(auto-fill,minmax(420px,1fr))}
figure{margin:0;border:1px solid var(--line);border-radius:8px;overflow:hidden}figure img{display:block;width:100%;height:auto;background:#808080}
figcaption{display:grid;gap:2px;padding:8px}.warn{color:#b25000}.missing div{padding:24px;text-align:center;color:#d70015;font-weight:600}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{padding:4px 8px;border-bottom:1px solid var(--line);text-align:left}`;

export function indexPage(input: IndexInput): string {
  const rows = input.pieces.map(({ piece, status, specimens }) => {
    const rendered = [...specimens.values()].filter(result => "captures" in result).length;
    return `<tr><td><a href="#${escape(piece.id)}">${escape(piece.id)}</a></td><td>${piece.kind}</td><td>${escape(status.entry.status)}</td>
      <td>${rendered} / ${piece.specimens?.list.length ?? 0}</td><td>${piece.destinations.length}</td></tr>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Catalog evidence ${escape(input.label)}</title><style>${style}</style></head><body><main>
<header><h1>Catalog evidence · ${escape(input.label)}</h1>
<p>Tree ${escape(input.revision)} · ${escape(input.createdAt)}. Each specimen image holds four renders: light on top, dark below; 390 px wide on
the left, 1280 px on the right. Every render is the piece's own owner mounted with the specimen's props in the evidence build (theme.css and
Tailwind), never a drawing. Click an image for full size.</p></header>
<section><table><thead><tr><th>Piece</th><th>Kind</th><th>Ledger</th><th>Specimens rendered</th><th>Visual Catalog pages</th></tr></thead>
<tbody>${rows}</tbody></table></section>
${input.pieces.map(pieceSection).join("\n")}
</main></body></html>
`;
}
