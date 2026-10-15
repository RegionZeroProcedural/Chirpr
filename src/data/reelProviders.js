// The client only embeds URLs we can recognize from supported providers.
// Provider players are cross-origin: they may refuse playback, set cookies,
// or prevent embedding. The original page is always available as a fallback.
export const REEL_PROVIDERS = [
  { id: 'youtube', label: 'YouTube Shorts', icon: '▶', hint: 'youtube.com/shorts/…' },
  { id: 'tiktok', label: 'TikTok', icon: '♪', hint: 'tiktok.com/@user/video/…' },
  { id: 'instagram', label: 'Instagram', icon: '◎', hint: 'instagram.com/reel/…' },
  { id: 'vimeo', label: 'Vimeo', icon: '▷', hint: 'vimeo.com/123456789' },
  { id: 'twitch', label: 'Twitch', icon: '◈', hint: 'twitch.tv/videos/… or clips.twitch.tv/…' }
];

const safeHost = (host, name) => host === name || host.endsWith(`.${name}`);

export function parseReelUrl(input) {
  let url;
  try { url = new URL(String(input).trim()); } catch { return null; }
  if (!['https:', 'http:'].includes(url.protocol)) return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname.split('/').filter(Boolean);
  let provider = null, embed = null;
  if (safeHost(host, 'youtube.com') || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    const id = host === 'youtu.be' ? path[0] : path[0] === 'shorts' || path[0] === 'embed' ? path[1] : url.searchParams.get('v');
    if (/^[\w-]{11}$/.test(id ?? '')) { provider = 'youtube'; embed = `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`; }
  } else if (safeHost(host, 'vimeo.com')) {
    const id = path.findLast(part => /^\d+$/.test(part));
    if (id) { provider = 'vimeo'; embed = `https://player.vimeo.com/video/${id}`; }
  } else if (safeHost(host, 'tiktok.com')) {
    const idx = path.indexOf('video');
    const id = idx >= 0 ? path[idx + 1] : null;
    if (/^\d{15,22}$/.test(id ?? '')) { provider = 'tiktok'; embed = `https://www.tiktok.com/embed/v2/${id}`; }
  } else if (safeHost(host, 'instagram.com')) {
    const kind = path[0];
    const code = path[1];
    if (['reel', 'reels', 'p'].includes(kind) && /^[\w-]{5,40}$/.test(code ?? '')) { provider = 'instagram'; embed = `https://www.instagram.com/p/${code}/embed/`; }
  } else if (safeHost(host, 'twitch.tv')) {
    const parent = window.location.hostname || 'localhost';
    const id = path[0] === 'videos' && /^\d+$/.test(path[1] ?? '') ? path[1] : null;
    const clip = (host === 'clips.twitch.tv' ? path[0] : path[1] === 'clip' ? path[2] : null);
    if (id) { provider = 'twitch'; embed = `https://player.twitch.tv/?video=v${id}&parent=${encodeURIComponent(parent)}`; }
    else if (/^[\w-]+$/.test(clip ?? '') && clip) { provider = 'twitch'; embed = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip)}&parent=${encodeURIComponent(parent)}`; }
  }
  if (!embed) return null;
  return { provider, embed, link: url.href };
}

export const STARTER_REELS = [
  { id: 'demo-bunny', title: 'Big Buck Bunny · creative inspiration', creator: 'Blender Foundation', link: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', note: 'Featured demo' },
  { id: 'demo-zoo', title: 'A moment from the beginning of YouTube', creator: 'Jawed', link: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', note: 'Featured demo' },
  { id: 'demo-vimeo', title: 'Explore a different video space', creator: 'Vimeo', link: 'https://vimeo.com/76979871', note: 'Featured demo' }
];

export const PERSONAL_REELS_KEY = 'chirpr-personal-reels-v1';
export function loadPersonalReels() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(PERSONAL_REELS_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter(item => item && typeof item.link === 'string' && parseReelUrl(item.link)).slice(0, 40) : [];
  } catch { return []; }
}
export function savePersonalReels(reels) {
  try { window.localStorage.setItem(PERSONAL_REELS_KEY, JSON.stringify(reels)); } catch { /* disabled storage */ }
}
