const assert = require('node:assert/strict');
const test = require('node:test');
const { createProviderService, createServer } = require('./reels-api');
const json = data => ({ ok: true, status: 200, json: async () => data });

test('Youtube returns actual API results and pagination token; URLs are encoded', async () => {
  let called = '';
  const service = createProviderService({ env: { YOUTUBE_API_KEY: 'private-api-key' }, fetchImpl: async url => {
    called = String(url);
    return json({ items: [{ id: { videoId: 'jNQXAC9IVRw' }, snippet: { title: 'A video', channelTitle: 'A person' } }], nextPageToken: 'PAGE_2' });
  }});
  const result = await service.list('youtube', '', 'the & test');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].link, 'https://www.youtube.com/shorts/jNQXAC9IVRw');
  assert.equal(result.nextCursor, 'PAGE_2');
  assert.equal(new URL(called).searchParams.get('q'), 'the & test');
  assert.equal(new URL(called).searchParams.get('videoEmbeddable'), 'true');
  // cached, no second provider request
  assert.deepEqual(await service.list('youtube', '', 'the & test'), result);
});

test('Missing token produces setup error, no made-up videos', async () => {
  const service = createProviderService({ env: {}, fetchImpl: async () => { throw new Error('should not call'); } });
  await assert.rejects(service.list('youtube'), { status: 424 });
  await assert.rejects(service.list('tiktok'), { status: 424 });
  await assert.rejects(service.list('instagram'), { status: 424 });
  await assert.rejects(service.list('vimeo'), { status: 424 });
  await assert.rejects(service.list('twitch'), { status: 424 });
});

test('TikTok authorized creator video list uses approved video.list endpoint', async () => {
  const service = createProviderService({ env: { TIKTOK_ACCESS_TOKEN: 'dummy' }, fetchImpl: async (url, opts) => {
    assert.match(String(url), /\/v2\/video\/list/);
    assert.equal(opts.method, 'POST');
    return json({ error: { code: 'ok' }, data: { videos: [{ id: '1234567890123456789', title: 'Creator video', share_url: 'https://www.tiktok.com/@user/video/1234567890123456789' }], has_more: true, cursor: 123456789 } });
  }});
  const result = await service.list('tiktok');
  assert.equal(result.items[0].provider, 'tiktok');
  assert.equal(result.nextCursor, '123456789');
});

test('Twitch OAuth and clips use platform APIs, no token included in result', async () => {
  const endpoints = [];
  const service = createProviderService({ env: { TWITCH_CLIENT_ID: 'test-client', TWITCH_CLIENT_SECRET: 'secret' }, fetchImpl: async url => {
    const u = String(url); endpoints.push(u);
    if (u.includes('oauth2/token')) return json({ access_token: 'private', expires_in: 3600 });
    if (u.includes('search/categories')) return json({ data: [{ id: '999', name: 'Minecraft' }] });
    if (u.includes('helix/clips')) return json({ data: [{ id: 'ClipSlug', url: 'https://clips.twitch.tv/ClipSlug', title: 'Clips', broadcaster_name: 'Streamer' }], pagination: { cursor: 'NEXT' } });
    throw new Error(u);
  }});
  const result = await service.list('twitch', '', 'Minecraft');
  assert.equal(result.items[0].link, 'https://clips.twitch.tv/ClipSlug');
  assert.equal(result.nextCursor, 'NEXT');
  assert.doesNotMatch(JSON.stringify(result), /private/);
  assert.equal(endpoints.length, 3);
});

test('GET endpoint works with allowed origins, disallows unknown origins', async () => {
  const server = createServer({ env: {}, service: { list: async platform => ({ platform, items: [], nextCursor: null }) } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/reels?platform=youtube`;
    const ok = await fetch(url, { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.deepEqual((await ok.json()).items, []);
    const forbidden = await fetch(url, { headers: { Origin: 'https://malicious.invalid' } });
    assert.equal(forbidden.status, 403);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
