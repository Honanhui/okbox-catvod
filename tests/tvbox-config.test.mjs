import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeTvboxConfig, fetchTvboxConfig, resolveRelativeConfigValues} from '../lib/tvbox-config.mjs';

test('Bridge-compatible decoder accepts comment JSON, marked Base64 and nested JSON strings', () => {
  assert.equal(decodeTvboxConfig('{/* header */"sites":[{"key":"one"}]}').sites[0].key, 'one');
  const nested = JSON.stringify(JSON.stringify({sites: [{key: 'two'}]}));
  assert.equal(decodeTvboxConfig(nested).sites[0].key, 'two');
  const encoded = Buffer.from(JSON.stringify({sites: [{key: 'three'}]})).toString('base64');
  assert.equal(decodeTvboxConfig(`abcdefgh**${encoded}`).sites[0].key, 'three');
});

test('Bridge-compatible loader retries a landing page with the next TVBox user agent', async () => {
  const agents = [];
  const fetcher = async (_url, options) => {
    agents.push(options.headers['user-agent']);
    if (agents.length === 1) return new Response('<html><body>landing</body></html>', {status: 200});
    return new Response(Buffer.from(JSON.stringify({sites: [{key: 'relative', ext: './js/rule.js'}]})).toString('base64'), {status: 200});
  };
  const result = await fetchTvboxConfig('https://example.test/tv/config.json', {fetcher, timeoutMs: 200});
  assert.equal(agents.length, 2);
  assert.equal(result.root.sites[0].ext, 'https://example.test/tv/js/rule.js');
});

test('relative values resolve recursively without changing absolute values', () => {
  assert.deepEqual(resolveRelativeConfigValues({a: './a.js', b: ['../b.js', 'https://fixed.test/x']}, 'https://example.test/path/config.json'), {
    a: 'https://example.test/path/a.js',
    b: ['https://example.test/b.js', 'https://fixed.test/x']
  });
});
