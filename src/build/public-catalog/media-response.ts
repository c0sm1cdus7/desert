import type { IncomingMessage, ServerResponse } from 'node:http';

/** Single-range reads let native video controls seek within a verified local asset. */
export function sendCatalogMedia(request: IncomingMessage, response: ServerResponse, asset: {
  bytes: Buffer; size: number; mediaType: string; digest?: string;
}) {
  const headers = { 'Content-Type': asset.mediaType, 'Accept-Ranges': 'bytes',
    ...(asset.digest ? { ETag: `"${asset.digest}"` } : {}),
    'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=3600',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" };
  if (asset.digest && request.headers['if-none-match'] === `"${asset.digest}"`) {
    response.writeHead(304, headers); response.end(); return;
  }
  const range = request.headers.range;
  if (range && request.method !== 'HEAD') {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const suffix = match && !match[1] ? Number(match[2]) : 0;
    const start = match?.[1] ? Number(match[1]) : Math.max(0, asset.size - suffix);
    const end = match?.[1] && match[2] ? Math.min(Number(match[2]), asset.size - 1) : asset.size - 1;
    if (!match || (!match[1] && !suffix) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= asset.size) {
      response.writeHead(416, { ...headers, 'Content-Range': `bytes */${asset.size}` }); response.end(); return;
    }
    response.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${asset.size}` });
    response.end(asset.bytes.subarray(start, end + 1)); return;
  }
  response.writeHead(200, { ...headers, 'Content-Length': asset.size });
  response.end(request.method === 'HEAD' ? undefined : asset.bytes);
}
