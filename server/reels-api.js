/* Chirpr's optional LOCAL, dependency-free API bridge (Node.js 20+).
 * Keep provider credentials here on the server, never in React / REACT_APP_*.
 * Provider limitations: TikTok / Instagram return authorized account media,
 * not arbitrary recommendation/For You feeds.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PROVIDERS = new Set(['youtube', 'twitch', 'vimeo', 'tiktok', 'instagram']);
const PREVIEW_LIMIT = 12;
const FAILURE_HINTS = {
  youtube: 'Set YOUTUBE_API_KEY (YouTube Data API v3 enabled).',
  twitch: 'Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.',
  vimeo: 'Set VIMEO_ACCESS_TOKEN.',
  tiktok: 'Set TIKTOK_ACCESS_TOKEN from an approved Display API OAuth connection (video.list).',
  instagram: 'Set INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN from an authorized professional Instagram account.'
};

class ProviderError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const required = (value, platform) => {
  if (!value) throw new ProviderError(424, `${platform} API is not connected. ${FAILURE_HINTS[platform]}`);
  return value;
};
const plain = value => typeof value === 'string' ? value : '';
const pageCursor = value => {
  if (!value) return '';
  if (!/^[a-zA-Z0-9_\-.:+=/]{1,240}$/.test(value)) throw new ProviderError(400, 'Invalid page cursor.');
  return value;
};
const textQuery = value => plain(value).trim().slice(0, 60);
const safeId = value => plain(value).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 100);

function createProviderService({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const cache = new Map();
  let twitchToken = { value: '', until: 0 };
  const twitchGames = new Map();

  async function getJson(url, options = {}) {
    let response;
    try { response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(12000) }); }
    catch { throw new ProviderError(502, 'The video provider could not be reached. Please try again.'); }
    if (!response.ok) {
      // Never echo the provider response: it may contain tokens or private details.
      if (response.status === 429) throw new ProviderError(429, 'The provider rate limit was reached. Please try again later.');
      if (response.status === 401 || response.status === 403) throw new ProviderError(502, 'The provider rejected the API credentials or permissions.');
      throw new ProviderError(502, `The provider returned HTTP ${response.status}.`);
    }
    try { return await response.json(); }
    catch { throw new ProviderError(502, 'The provider sent an invalid response.'); }
  }

  async function youtube(cursor, q) {
    const key = required(env.YOUTUBE_API_KEY, 'youtube');
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.search = new URLSearchParams({ part: 'snippet', type: 'video', videoDuration: 'short', videoEmbeddable: 'true', maxResults: String(PREVIEW_LIMIT), order: 'date', q: q || '#shorts', key }).toString();
    if (cursor) url.searchParams.set('pageToken', cursor);
    const response = await getJson(url);
    return {
      items: (response.items || []).filter(item => /^[\w-]{11}$/.test(item.id?.videoId || '')).map(item => ({
        id: `youtube-${item.id.videoId}`, provider: 'youtube', title: item.snippet?.title || 'YouTube video',
        creator: item.snippet?.channelTitle || 'YouTube', link: `https://www.youtube.com/shorts/${item.id.videoId}`,
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
        description: item.snippet?.description || ''
      })),
      nextCursor: response.nextPageToken || null,
      notice: 'YouTube search returns short videos; its public Data API does not guarantee every result is a vertical Short.'
    };
  }

  async function twitchAccessToken() {
    if (twitchToken.value && twitchToken.until > Date.now()) return twitchToken.value;
    const id = required(env.TWITCH_CLIENT_ID, 'twitch');
    const secret = required(env.TWITCH_CLIENT_SECRET, 'twitch');
    const body = new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' });
    const response = await getJson('https://id.twitch.tv/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    if (!response.access_token) throw new ProviderError(502, 'Twitch did not issue an app token.');
    twitchToken = { value: response.access_token, until: Date.now() + Math.max(60, (response.expires_in || 600) - 120) * 1000 };
    return twitchToken.value;
  }

  async function twitch(cursor, q) {
    const auth = await twitchAccessToken();
    const headers = { 'Client-Id': env.TWITCH_CLIENT_ID, Authorization: `Bearer ${auth}` };
    const gameName = q || 'Minecraft';
    let game = twitchGames.get(gameName);
    if (!game) {
      const search = new URL('https://api.twitch.tv/helix/search/categories');
      search.search = new URLSearchParams({ query: gameName, first: '10' }).toString();
      const options = await getJson(search, { headers });
      game = (options.data || []).find(item => item.name.toLowerCase() === gameName.toLowerCase()) || options.data?.[0];
      if (!game) return { items: [], nextCursor: null, notice: `No Twitch category found for “${gameName}”.` };
      twitchGames.set(gameName, game);
    }
    const url = new URL('https://api.twitch.tv/helix/clips');
    url.search = new URLSearchParams({ game_id: game.id, first: String(PREVIEW_LIMIT) }).toString();
    if (cursor) url.searchParams.set('after', cursor);
    const response = await getJson(url, { headers });
    return {
      items: (response.data || []).filter(item => item.id && item.url).map(item => ({
        id: `twitch-${safeId(item.id)}`, provider: 'twitch', title: item.title || 'Twitch clip', creator: item.broadcaster_name || 'Twitch',
        link: item.url, thumbnail: item.thumbnail_url || '', description: `${item.view_count || 0} views · ${game.name}`
      })), nextCursor: response.pagination?.cursor || null,
      notice: `Twitch clips from ${game.name}; sorted by the provider's clip ranking, not a personal recommendation feed.`
    };
  }

  async function vimeo(cursor, q) {
    const accessToken = required(env.VIMEO_ACCESS_TOKEN, 'vimeo');
    const page = cursor ? Number(cursor) : 1;
    if (!Number.isInteger(page) || page < 1 || page > 100) throw new ProviderError(400, 'Invalid Vimeo page.');
    const url = new URL('https://api.vimeo.com/videos');
    url.search = new URLSearchParams({ query: q || 'short film', per_page: String(PREVIEW_LIMIT), page: String(page), sort: 'date', direction: 'desc' }).toString();
    const response = await getJson(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.vimeo.*+json;version=3.4' } });
    return {
      items: (response.data || []).filter(item => /^https:\/\/(www\.)?vimeo\.com\/\d+/.test(item.link || '')).map(item => ({
        id: `vimeo-${safeId(item.uri?.split('/').pop())}`, provider: 'vimeo', title: item.name || 'Vimeo video',
        creator: item.user?.name || 'Vimeo', link: item.link, thumbnail: item.pictures?.sizes?.at(-1)?.link || '',
        description: item.description?.slice(0, 180) || ''
      })), nextCursor: response.paging?.next ? String(page + 1) : null,
      notice: 'Vimeo public search results; not a personalized short-form recommendation feed.'
    };
  }

  async function tiktok(cursor) {
    const token = required(env.TIKTOK_ACCESS_TOKEN, 'tiktok');
    const url = new URL('https://open.tiktokapis.com/v2/video/list/');
    url.searchParams.set('fields', 'id,title,video_description,share_url,cover_image_url,embed_link,create_time');
    const body = { max_count: PREVIEW_LIMIT };
    if (cursor) {
      if (!/^\d{1,17}$/.test(cursor)) throw new ProviderError(400, 'Invalid TikTok cursor.');
      body.cursor = Number(cursor);
    }
    const response = await getJson(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (response.error?.code && response.error.code !== 'ok') throw new ProviderError(502, 'TikTok rejected the request. Check video.list OAuth permissions.');
    return {
      items: (response.data?.videos || []).filter(item => /https:\/\/(www\.)?tiktok\.com\//.test(item.share_url || '')).map(item => ({
        id: `tiktok-${safeId(item.id)}`, provider: 'tiktok', title: item.title || item.video_description || 'TikTok video',
        creator: 'Connected TikTok creator', link: item.share_url, thumbnail: item.cover_image_url || '', description: item.video_description || ''
      })), nextCursor: response.data?.has_more ? String(response.data?.cursor || '') : null,
      notice: 'TikTok Display API provides the connected creator’s public videos only; it does not expose a general For You feed.'
    };
  }

  async function instagram(cursor) {
    const token = required(env.INSTAGRAM_ACCESS_TOKEN, 'instagram');
    const userId = required(env.INSTAGRAM_USER_ID, 'instagram');
    if (!/^\d{5,30}$/.test(userId)) throw new ProviderError(400, 'Invalid Instagram account ID.');
    const version = /^v\d+\.\d+$/.test(env.INSTAGRAM_GRAPH_VERSION || '') ? env.INSTAGRAM_GRAPH_VERSION : 'v24.0';
    const url = new URL(`https://graph.instagram.com/${version}/${userId}/media`);
    url.search = new URLSearchParams({ fields: 'id,caption,media_type,media_product_type,permalink,thumbnail_url,username,timestamp', limit: String(PREVIEW_LIMIT), access_token: token }).toString();
    if (cursor) url.searchParams.set('after', cursor);
    const response = await getJson(url);
    return {
      items: (response.data || []).filter(item => (item.media_product_type === 'REELS' || item.media_type === 'VIDEO') && /^https:\/\/(www\.)?instagram\.com\/(reel|p)\//.test(item.permalink || '')).map(item => ({
        id: `instagram-${safeId(item.id)}`, provider: 'instagram', title: item.caption?.slice(0, 100) || 'Instagram reel',
        creator: item.username || 'Connected Instagram account', link: item.permalink, thumbnail: item.thumbnail_url || '', description: item.caption || ''
      })), nextCursor: response.paging?.next ? response.paging?.cursors?.after || null : null,
      notice: 'Instagram API access is limited to the connected professional account and permitted media; no general Reels discovery feed.'
    };
  }

  async function list(platform, cursor = '', query = '') {
    if (!PROVIDERS.has(platform)) throw new ProviderError(400, 'Unsupported platform.');
    cursor = pageCursor(cursor); query = textQuery(query);
    const key = `${platform}:${cursor}:${query}`;
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;
    const methods = { youtube, twitch, vimeo, tiktok, instagram };
    const data = await methods[platform](cursor, query);
    const value = { platform, items: data.items || [], nextCursor: data.nextCursor || null, notice: data.notice || '' };
    // Cache API results to protect YouTube/Twitch/provider quota on repeated views.
    cache.set(key, { expires: Date.now() + 5 * 60 * 1000, value });
    if (cache.size > 150) cache.delete(cache.keys().next().value);
    return value;
  }
  return { list };
}

function createServer({ env = process.env, service = createProviderService({ env }) } = {}) {
  const allowed = new Set((env.CHIRPR_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(s => s.trim()));
  const send = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    }
    if (origin && !allowed.has(origin)) return send(res, 403, { error: 'Origin not allowed.' });
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed.' });
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/reels/health') return send(res, 200, { ok: true, platforms: [...PROVIDERS] });
    if (url.pathname !== '/api/reels') return send(res, 404, { error: 'Not found.' });
    try {
      const value = await service.list(url.searchParams.get('platform') || '', url.searchParams.get('cursor') || '', url.searchParams.get('q') || '');
      return send(res, 200, value);
    } catch (error) {
      return send(res, error instanceof ProviderError ? error.status : 500, { error: error instanceof ProviderError ? error.message : 'Unexpected error fetching provider videos.' });
    }
  });
}

function loadLocalEnv() {
  const filename = path.join(__dirname, '.env');
  if (!fs.existsSync(filename)) return;
  for (const line of fs.readFileSync(filename, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^([\"'])(.*)\1$/, '$2');
    }
  }
}

if (require.main === module) {
  loadLocalEnv();
  const port = Number(process.env.CHIRPR_REELS_PORT || 8787);
  // Bind to localhost; never expose a development API with OAuth credentials publicly.
  createServer().listen(port, '127.0.0.1', () => console.log(`Chirpr reels API bridge running at http://127.0.0.1:${port}`));
}
module.exports = { createServer, createProviderService, ProviderError };
