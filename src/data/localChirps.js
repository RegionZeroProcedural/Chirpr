// Frontend prototype only. Each chirp belongs to its author's mock user ID.
// A backend can later replace these functions without changing the components.
import { parsePostTokens } from './postText.js';

export const LOCAL_CHIRPS_KEY = 'chirpr-demo-local-chirps-v1';

export function loadLocalChirps() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(LOCAL_CHIRPS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(post =>
      post && typeof post.id === 'string' &&
      (typeof post.uid === 'string' || typeof post.uid === 'number') &&
      typeof post.text === 'string' && (post.text.trim().length > 0 || !!post.attachment?.id)
    ).slice(0, 250);
  } catch {
    return [];
  }
}

export function saveLocalChirps(posts) {
  try {
    window.localStorage.setItem(LOCAL_CHIRPS_KEY, JSON.stringify(posts.slice(0, 250)));
  } catch {
    // Keep the in-memory post if storage is disabled or full.
  }
}

export function makeLocalChirp(uid, text, options = {}) {
  const { hashtags, mentions } = parsePostTokens(text);
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    uid,
    text: text.trim().slice(0, 500),
    hashtags, mentions,
    attachment: options.attachment ?? null,
    reelsOptIn: options.attachment?.kind === 'video' && options.reelsOptIn === true,
    groupId: options.groupId || null,
    moderationStatus: options.attachment ? 'pending_review' : 'pending_review',
    age: 'now',
    topic: 'JUST CHIRPED',
    likes: 0,
    replies: 0,
    shares: 0,
    accent: 'blue',
    createdAt: Date.now()
  };
}
