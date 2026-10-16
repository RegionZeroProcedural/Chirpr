import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { removeMedia, storeMedia, validateMedia } from '../../data/mediaVault.js';
import { getModerationSignal } from '../../data/moderationClient.js';

export const SOCIAL_STORAGE_KEY = 'chirpr-social-v1';
export const REACTIONS = Object.freeze([{ id: 'like', icon: '👍', label: 'Like' }, { id: 'love', icon: '❤️', label: 'Love' }, { id: 'haha', icon: '😆', label: 'Haha' }, { id: 'wow', icon: '😮', label: 'Wow' }, { id: 'sad', icon: '😢', label: 'Sad' }, { id: 'angry', icon: '😠', label: 'Angry' }]);
const empty = () => ({ reactions: {}, likes: {}, reposts: {}, repostNotes: {}, follows: {}, replies: {}, messages: [], notifications: [], reports: [], muted: {}, blocked: {}, readNotifications: [], preferences: {} });
const asRecord = obj => obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
export function normalizeSocial(value) {
  const v = asRecord(value);
  return {
    ...empty(),
    likes: asRecord(v.likes), reactions: asRecord(v.reactions), reposts: asRecord(v.reposts), follows: asRecord(v.follows),
    replies: asRecord(v.replies), repostNotes: asRecord(v.repostNotes), muted: asRecord(v.muted), blocked: asRecord(v.blocked),
    preferences: asRecord(v.preferences),
    messages: Array.isArray(v.messages) ? v.messages.slice(-400) : [],
    notifications: Array.isArray(v.notifications) ? v.notifications.slice(-250) : [],
    reports: Array.isArray(v.reports) ? v.reports.slice(-250) : [],
    readNotifications: Array.isArray(v.readNotifications) ? v.readNotifications : []
  };
}
const load = () => { try { return normalizeSocial(JSON.parse(window.localStorage.getItem(SOCIAL_STORAGE_KEY) || '{}')); } catch { return empty(); } };
const id = () => `social-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const includes = (obj, key, uid) => (Array.isArray(obj[String(key)]) ? obj[String(key)] : []).some(item => String(item) === String(uid));
const toggle = (obj, key, uid) => {
  const old = Array.isArray(obj[String(key)]) ? obj[String(key)] : [];
  return { ...obj, [String(key)]: old.some(x => String(x) === String(uid)) ? old.filter(x => String(x) !== String(uid)) : [...old, uid] };
};
const SocialContext = createContext(null);

export function SocialProvider({ currentUser, users = [], posts = [], guestMode = false, children }) {
  const [state, setState] = useState(load);
  const myId = currentUser?.uid;
  useEffect(() => {
    const sync = event => { if (event.key === SOCIAL_STORAGE_KEY) setState(load()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    document.body.classList.toggle('chirpr-reduce-motion', !!state.preferences[String(myId)]?.reduceAnimations);
    return () => document.body.classList.remove('chirpr-reduce-motion');
  }, [state.preferences, myId]);
  const modify = useCallback(fn => setState(prev => {
    const next = normalizeSocial(fn(prev));
    // Guest reactions, messages and follows live only in the current tab.
    if (!guestMode) {
      try { window.localStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify(next)); } catch { /* local-only fallback */ }
    }
    return next;
  }), [guestMode]);
  const alert = (toUid, type, description, href) => ({ id: id(), toUid, fromUid: myId, type, description, href, date: Date.now() });
  // The legacy likes map is read as a fallback for older browser data; new reactions
  // are stored per account. Removing/replacing a reaction never changes other users.
  const reactionFor = (postId, uid = myId, value = state) => {
    const map = asRecord(value.reactions[String(postId)]);
    return map[String(uid)] || (includes(value.likes, postId, uid) ? 'like' : null);
  };
  const reactionSummary = postId => {
    const map = asRecord(state.reactions[String(postId)]);
    const combined = { ...map };
    (state.likes[String(postId)] || []).forEach(uid => { if (!combined[String(uid)]) combined[String(uid)] = 'like'; });
    const counts = {};
    Object.values(combined).forEach(kind => { if (REACTIONS.some(r => r.id === kind)) counts[kind] = (counts[kind] || 0) + 1; });
    return { counts, total: Object.values(counts).reduce((a, b) => a + b, 0), top: REACTIONS.filter(r => counts[r.id]).sort((a,b) => counts[b.id] - counts[a.id]).slice(0,3) };
  };
  const reactToPost = (post, kind) => {
    if (myId == null || !post || !REACTIONS.some(r => r.id === kind)) return;
    modify(s => {
      const old = asRecord(s.reactions[String(post.id)]);
      const previous = old[String(myId)] || (includes(s.likes, post.id, myId) ? 'like' : null);
      const next = { ...old };
      if (previous === kind) delete next[String(myId)]; else next[String(myId)] = kind;
      const legacy = (s.likes[String(post.id)] || []).filter(uid => String(uid) !== String(myId));
      const notification = previous !== kind && String(post.uid) !== String(myId) && kind !== null
        ? [...s.notifications, alert(post.uid, 'reaction', `reacted ${REACTIONS.find(r => r.id === kind).icon} to your chirp`, `/chirp/${post.id}`)] : s.notifications;
      return { ...s, reactions: { ...s.reactions, [String(post.id)]: next }, likes: { ...s.likes, [String(post.id)]: legacy }, notifications: notification };
    });
  };
  const toggleLike = post => reactToPost(post, 'like');
  const toggleRepost = (post, commentary = '') => {
    if (myId == null || !post) return;
    // Rechirping a rechirp references its source, never nests virtual copies.
    const sourceId = String(post.originalPostId || post.id);
    const source = posts.find(p => String(p.id) === sourceId) || post;
    modify(s => {
      const wasShared = includes(s.reposts, sourceId, myId);
      const key = `${myId}:${sourceId}`;
      const notes = { ...s.repostNotes };
      if (wasShared) delete notes[key];
      else notes[key] = commentary.trim().slice(0, 500);
      return {
        ...s, reposts: toggle(s.reposts, sourceId, myId), repostNotes: notes,
        notifications: !wasShared && String(source.uid) !== String(myId)
          ? [...s.notifications, alert(source.uid, 'repost', 'rechirped your post', `/chirp/${encodeURIComponent(sourceId)}`)]
          : s.notifications
      };
    });
  };
  const removeRepost = (rechirpId) => {
    if (myId == null) return false;
    const match = /^rechirp-([^-]+)-(.+)$/.exec(String(rechirpId));
    if (!match || String(match[1]) !== String(myId)) return false;
    const sourceId = match[2];
    modify(s => {
      const notes = { ...s.repostNotes };
      delete notes[`${myId}:${sourceId}`];
      const current = Array.isArray(s.reposts[sourceId]) ? s.reposts[sourceId] : [];
      return { ...s, repostNotes: notes, reposts: { ...s.reposts, [sourceId]: current.filter(uid => String(uid) !== String(myId)) } };
    });
    return true;
  };
  const toggleFollow = uid => { if (myId == null || String(uid) === String(myId)) return; modify(s => ({ ...s, follows: toggle(s.follows, uid, myId), notifications: !includes(s.follows, uid, myId) ? [...s.notifications, alert(uid, 'follow', 'started following you', `/users/${users.find(u => String(u.uid) === String(myId))?.username || ''}`)] : s.notifications })); };
  const addReply = (post, text) => {
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed || myId == null) return false;
    modify(s => ({ ...s, replies: { ...s.replies, [String(post.id)]: [...(s.replies[String(post.id)] || []), { id: id(), uid: myId, text: trimmed, at: Date.now() }] }, notifications: String(post.uid) === String(myId) ? s.notifications : [...s.notifications, alert(post.uid, 'reply', 'replied to your chirp', `/chirp/${post.id}`)] }));
    return true;
  };
  const sendMessage = (toUid, text, attachment = null) => {
    const value = String(text || '').trim().slice(0, 1200);
    if ((!value && !attachment) || myId == null || !users.some(u => String(u.uid) === String(toUid)) || String(toUid) === String(myId)) return false;
    modify(s => ({ ...s, messages: [...s.messages, { id: id(), fromUid: myId, toUid, text: value, attachment, reactions: {}, at: Date.now() }], notifications: [...s.notifications, alert(toUid, 'message', 'sent you a message', `/messages/${myId}`)] }));
    return true;
  };
  const sendMediaMessage = async (toUid, file, text = '') => {
    if (!file || myId == null || String(toUid) === String(myId)) return false;
    validateMedia(file);
    const attachment = await storeMedia(file);
    try {
      attachment.moderation = await getModerationSignal(text, file);
      // Automatic moderation failure is not a human-review queue or approval.
      if (attachment.moderation.status === 'rejected') throw new Error('This media could not be sent under the content rules.');
      const ok = sendMessage(toUid, text, attachment);
      if (!ok) throw new Error('Could not deliver this demo message.');
      return true;
    } catch(error) { await removeMedia(attachment.id).catch(() => {}); throw error; }
  };
  const unsendMessage = messageId => {
    if (myId == null) return;
    modify(s => ({ ...s, messages: s.messages.map(m => String(m.id) === String(messageId) && String(m.fromUid) === String(myId)
      ? { ...m, text: '', attachment: null, unsent: true, forwardedFrom: null, reactions: {} } : m) }));
  };
  const reactToMessage = (messageId, kind) => {
    if (myId == null || !REACTIONS.some(r => r.id === kind)) return;
    modify(s => ({ ...s, messages: s.messages.map(m => {
      if (String(m.id) !== String(messageId) || m.unsent || ![m.fromUid,m.toUid].some(uid => String(uid) === String(myId))) return m;
      const reactions = { ...asRecord(m.reactions) };
      if (reactions[String(myId)] === kind) delete reactions[String(myId)]; else reactions[String(myId)] = kind;
      return { ...m, reactions };
    }) }));
  };
  const forwardMessage = (messageId, toUid) => {
    const source = state.messages.find(m => String(m.id) === String(messageId) && !m.unsent && [m.fromUid,m.toUid].some(uid => String(uid) === String(myId)));
    if (!source) return false;
    const to = users.find(u => String(u.uid) === String(toUid));
    if (!to || String(to.uid) === String(myId)) return false;
    modify(s => ({ ...s, messages: [...s.messages, { id: id(), fromUid: myId, toUid: to.uid, text: source.text, attachment: source.attachment || null,
      forwardedFrom: source.id, reactions: {}, at: Date.now() }], notifications: [...s.notifications, alert(to.uid, 'message', 'forwarded a message', `/messages/${myId}`)] }));
    return true;
  };
  const report = (targetId, type, reason, notes = '') => { if (!reason || myId == null) return; modify(s => ({ ...s, reports: [...s.reports, { id: id(), targetId: String(targetId), type, reason, notes: notes.slice(0, 500), reporterUid: myId, status: 'submitted', date: Date.now() }] })); };
  const markRead = () => modify(s => ({ ...s, readNotifications: [...new Set([...s.readNotifications, ...s.notifications.filter(n => String(n.toUid) === String(myId)).map(n => n.id)])] }));
  const setPrivacy = (name, value) => modify(s => ({ ...s, preferences: { ...s.preferences, [String(myId)]: { ...s.preferences[String(myId)], [name]: value } } }));
  const toggleSafety = (type, targetUid) => { if (type !== 'blocked' && type !== 'muted') return; modify(s => ({ ...s, [type]: toggle(s[type], myId, targetUid) })); };
  const values = useMemo(() => ({
    state, currentUser, users, posts, toggleLike, reactToPost, reactionFor, reactionSummary, toggleRepost, removeRepost, toggleFollow, addReply, sendMessage, sendMediaMessage, unsendMessage, reactToMessage, forwardMessage, report, markRead, setPrivacy, toggleSafety,
    liked: postId => !!reactionFor(postId),
    reposted: postId => includes(state.reposts, String(postId).startsWith('rechirp-') ? String(postId).replace(/^rechirp-[^-]+-/, '') : postId, myId),
    following: uid => includes(state.follows, uid, myId),
    followingCount: uid => (state.follows[String(uid)] || []).length,
    followCount: uid => Object.values(state.follows).filter(f => Array.isArray(f) && f.some(x => String(x) === String(uid))).length,
    repliesFor: postId => state.replies[String(postId)] || [],
    likeCount: postId => reactionSummary(postId).total,
    repostCount: postId => (state.reposts[String(postId)] || []).length,
    isBlocked: uid => includes(state.blocked, myId, uid),
    isMuted: uid => includes(state.muted, myId, uid),
    prefs: state.preferences[String(myId)] || {},
    unread: state.notifications.filter(n => String(n.toUid) === String(myId) && !state.readNotifications.includes(n.id)).length
  }), [state, currentUser, users, posts, myId]); // Actions use modify(state=>...) to avoid stale state.
  return <SocialContext.Provider value={values}>{children}</SocialContext.Provider>;
}
export function useSocial() { return useContext(SocialContext); }
