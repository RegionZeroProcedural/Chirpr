export const GROUPS_KEY = 'chirpr-groups-v1';
const defaults = [
  { id: 'creators', name: 'The Creators Club', description: 'Ideas, designs, prototypes, and work in progress.', emoji: '✳', ownerUid: 2, memberUids: [1,2], private: false },
  { id: 'after-hours', name: 'After Hours', description: 'Music, games, and those late-night thoughts.', emoji: '☾', ownerUid: 3, memberUids: [3], private: false },
  { id: 'photography', name: 'Through the Lens', description: 'Photos, visuals, and the moments behind them.', emoji: '◈', ownerUid: 2, memberUids: [2], private: false }
];
export function loadGroups() {
  try { const saved = JSON.parse(localStorage.getItem(GROUPS_KEY) || 'null'); return Array.isArray(saved) ? saved : defaults; }
  catch { return defaults; }
}
export function saveGroups(groups) { try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)); return true; } catch { return false; } }
export function makeGroup(name, description, uid, options = {}) {
  return { id: `group-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: name.trim().slice(0,60), description: description.trim().slice(0,240), emoji: '✦', ownerUid: uid, memberUids: [uid], pendingMemberUids: [], removedPostIds: [], pinnedPostIds: [], rules: (options.rules || '').slice(0,700), private: !!options.private };
}
