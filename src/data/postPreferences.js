// Frontend-only post actions. One store powers both the feed and profile pages.
// The server will become the authority for these actions when Chirpr has a backend.
export const POST_PREFERENCES_KEY = 'chirpr-post-preferences-v1';
export const EMPTY_POST_PREFERENCES = { edits: {}, deleted: [], hidden: [], saved: [] };

export function normalizePostPreferences(value) {
  const ids = field => Array.isArray(value?.[field])
    ? [...new Set(value[field].filter(id => typeof id === 'string'))].slice(0, 400)
    : [];
  const edits = value?.edits && typeof value.edits === 'object' && !Array.isArray(value.edits)
    ? Object.fromEntries(Object.entries(value.edits)
      .filter(([id, text]) => typeof id === 'string' && typeof text === 'string' && text.trim() && text.length <= 500)
      .slice(-400))
    : {};
  return { edits, deleted: ids('deleted'), hidden: ids('hidden'), saved: ids('saved') };
}

export function loadPostPreferences() {
  try { return normalizePostPreferences(JSON.parse(window.localStorage.getItem(POST_PREFERENCES_KEY) || '{}')); }
  catch { return { ...EMPTY_POST_PREFERENCES }; }
}

export function savePostPreferences(next) {
  try { window.localStorage.setItem(POST_PREFERENCES_KEY, JSON.stringify(next)); }
  catch { /* Keep in-memory state if localStorage is restricted. */ }
}

export function applyPostPreferences(posts, preferences) {
  const excluded = new Set([...preferences.deleted, ...preferences.hidden]);
  return posts.filter(post => !excluded.has(String(post.id))).map(post =>
    Object.prototype.hasOwnProperty.call(preferences.edits, String(post.id))
      ? { ...post, text: preferences.edits[String(post.id)] }
      : post
  );
}
