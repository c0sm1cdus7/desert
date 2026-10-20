import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { sendCatalogMedia } from '../src/build/public-catalog/media-response.ts';

test('verified local video assets support bounded ranges and HEAD', async () => {
  const server = createServer((req, res) => sendCatalogMedia(req, res, { bytes: Buffer.from('0123456789'), size: 10, mediaType: 'video/mp4' }));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}`;
    for (const [range, expected] of [['bytes=2-5', '2345'], ['bytes=7-', '789'], ['bytes=-3', '789']]) {
      const response = await fetch(url, { headers: { range: range! } });
      assert.equal(response.status, 206); assert.equal(await response.text(), expected);
    }
    assert.equal((await fetch(url, { headers: { range: 'bytes=10-' } })).status, 416);
    assert.equal((await fetch(url, { headers: { range: 'bytes=0-1,3-4' } })).status, 416);
    const head = await fetch(url, { method: 'HEAD' });
    assert.equal(head.headers.get('content-length'), '10'); assert.equal(await head.text(), '');
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
