import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const SOCIAL_STORAGE_KEY = 'chirpr-social-v1';
const empty = () => ({ likes: {}, reposts: {}, follows: {}, replies: {}, messages: [], notifications: [], reports: [], muted: {}, blocked: {}, readNotifications: [], preferences: {} });
const asRecord = obj => obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
export function normalizeSocial(value) {
  const v = asRecord(value);
  return {
    ...empty(),
    likes: asRecord(v.likes), reposts: asRecord(v.reposts), follows: asRecord(v.follows),
    replies: asRecord(v.replies), muted: asRecord(v.muted), blocked: asRecord(v.blocked),
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

export function SocialProvider({ currentUser, users = [], posts = [], children }) {
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
    try { window.localStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify(next)); } catch { /* local-only fallback */ }
    return next;
  }), []);
  const alert = (toUid, type, description, href) => ({ id: id(), toUid, fromUid: myId, type, description, href, date: Date.now() });
  const toggleLike = post => { if (myId == null) return; modify(s => ({ ...s, likes: toggle(s.likes, post.id, myId), notifications: String(post.uid) !== String(myId) && !includes(s.likes, post.id, myId) ? [...s.notifications, alert(post.uid, 'like', 'liked your chirp', `/chirp/${post.id}`)] : s.notifications })); };
  const toggleRepost = post => { if (myId == null) return; modify(s => ({ ...s, reposts: toggle(s.reposts, post.id, myId), notifications: String(post.uid) !== String(myId) && !includes(s.reposts, post.id, myId) ? [...s.notifications, alert(post.uid, 'repost', 'rechirped your post', `/chirp/${post.id}`)] : s.notifications })); };
  const toggleFollow = uid => { if (myId == null || String(uid) === String(myId)) return; modify(s => ({ ...s, follows: toggle(s.follows, uid, myId), notifications: !includes(s.follows, uid, myId) ? [...s.notifications, alert(uid, 'follow', 'started following you', `/users/${users.find(u => String(u.uid) === String(myId))?.username || ''}`)] : s.notifications })); };
  const addReply = (post, text) => {
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed || myId == null) return false;
    modify(s => ({ ...s, replies: { ...s.replies, [String(post.id)]: [...(s.replies[String(post.id)] || []), { id: id(), uid: myId, text: trimmed, at: Date.now() }] }, notifications: String(post.uid) === String(myId) ? s.notifications : [...s.notifications, alert(post.uid, 'reply', 'replied to your chirp', `/chirp/${post.id}`)] }));
    return true;
  };
  const sendMessage = (toUid, text) => { const value = text.trim().slice(0, 1200); if (!value || String(toUid) === String(myId)) return false; modify(s => ({ ...s, messages: [...s.messages, { id: id(), fromUid: myId, toUid, text: value, at: Date.now() }], notifications: [...s.notifications, alert(toUid, 'message', 'sent you a message', `/messages/${myId}`)] })); return true; };
  const report = (targetId, type, reason, notes = '') => { if (!reason || myId == null) return; modify(s => ({ ...s, reports: [...s.reports, { id: id(), targetId: String(targetId), type, reason, notes: notes.slice(0, 500), reporterUid: myId, status: 'submitted', date: Date.now() }] })); };
  const markRead = () => modify(s => ({ ...s, readNotifications: [...new Set([...s.readNotifications, ...s.notifications.filter(n => String(n.toUid) === String(myId)).map(n => n.id)])] }));
  const setPrivacy = (name, value) => modify(s => ({ ...s, preferences: { ...s.preferences, [String(myId)]: { ...s.preferences[String(myId)], [name]: value } } }));
  const toggleSafety = (type, targetUid) => { if (type !== 'blocked' && type !== 'muted') return; modify(s => ({ ...s, [type]: toggle(s[type], myId, targetUid) })); };
  const values = useMemo(() => ({
    state, currentUser, users, posts, toggleLike, toggleRepost, toggleFollow, addReply, sendMessage, report, markRead, setPrivacy, toggleSafety,
    liked: postId => includes(state.likes, postId, myId),
    reposted: postId => includes(state.reposts, postId, myId),
    following: uid => includes(state.follows, uid, myId),
    followingCount: uid => (state.follows[String(uid)] || []).length,
    followCount: uid => Object.values(state.follows).filter(f => Array.isArray(f) && f.some(x => String(x) === String(uid))).length,
    repliesFor: postId => state.replies[String(postId)] || [],
    likeCount: postId => (state.likes[String(postId)] || []).length,
    repostCount: postId => (state.reposts[String(postId)] || []).length,
    isBlocked: uid => includes(state.blocked, myId, uid),
    isMuted: uid => includes(state.muted, myId, uid),
    prefs: state.preferences[String(myId)] || {},
    unread: state.notifications.filter(n => String(n.toUid) === String(myId) && !state.readNotifications.includes(n.id)).length
  }), [state, currentUser, users, posts, myId]); // Actions use modify(state=>...) to avoid stale state.
  return <SocialContext.Provider value={values}>{children}</SocialContext.Provider>;
}
export function useSocial() { return useContext(SocialContext); }
