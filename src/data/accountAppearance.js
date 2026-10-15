// Shared account-appearance model. A future API can return the same object
// as a property on each user without changing the profile UI.
export const THEME_PRESETS = [
  { id: 'aurora', label: 'Aurora', subtitle: 'Soft atmospheric light', glyph: '✦' },
  { id: 'nebula', label: 'Nebula', subtitle: 'A celestial haze', glyph: '◈' },
  { id: 'midnight', label: 'Midnight', subtitle: 'Dark and minimal', glyph: '◌' },
  { id: 'prism', label: 'Prism', subtitle: 'Faceted luminous glass', glyph: '◇' },
  { id: 'ember', label: 'Ember', subtitle: 'Warm drifting sparks', glyph: '✳' }
];

export const DEFAULT_APPEARANCE = Object.freeze({ theme: 'aurora', color: '#8B91FF' });
const STORAGE_KEY = 'chirpr-account-appearance-v1';

export function normalizeAppearance(value) {
  const theme = THEME_PRESETS.some(item => item.id === value?.theme) ? value.theme : DEFAULT_APPEARANCE.theme;
  const color = /^#[0-9a-fA-F]{6}$/.test(value?.color ?? '') ? value.color.toUpperCase() : DEFAULT_APPEARANCE.color;
  return { theme, color };
}

export function loadAppearances() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    return Object.fromEntries(Object.entries(stored).map(([uid, appearance]) => [uid, normalizeAppearance(appearance)]));
  } catch { return {}; }
}

export function saveAppearances(byUid) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(byUid)); }
  catch { /* Storage may be disabled; keep the in-memory preview. */ }
}

export const APPEARANCE_STORAGE_KEY = STORAGE_KEY;

// We use the hue from the native color input to tint the scene gradients.
export function hexToHue(hex) {
  const normalized = normalizeAppearance({ color: hex }).color;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(normalized.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (!delta) return 225;
  let h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return Math.round((h * 60 + 360) % 360);
}
