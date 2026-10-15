/**
 * In-tab, non-blocking media queue. Ownership lives outside the upload modal so
 * closing/navigating away cannot cancel an IndexedDB write or moderation request.
 * NOT a background-sync worker: leaving/reloading the tab can interrupt a task.
 * Nothing is publicly approved by this queue.
 */
import { removeMedia, storeMedia, validateMedia } from './mediaVault.js';
import { getModerationSignal } from './moderationClient.js';

let uploads = [];
const listeners = new Set();
const MAX_RECENT = 6;
const EXPIRE_MS = 20000;

export function getMediaUploads() { return uploads; }
export function subscribeMediaUploads(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function broadcast(next) {
  uploads = next.slice(-MAX_RECENT);
  listeners.forEach(listener => listener());
}
function update(id, changes) {
  broadcast(uploads.map(upload => upload.id === id ? { ...upload, ...changes } : upload));
}
export function dismissMediaUpload(id) { broadcast(uploads.filter(upload => upload.id !== id)); }

export function enqueueMediaUpload({ file, caption = '', warning = '', alt = '', shareToReels = false, groupId = null,
  isProfile = false, profileUsername = '', onPublish }) {
  const kind = validateMedia(file);
  if (typeof onPublish !== 'function') throw new Error('Posting is unavailable right now.');
  const id = window.crypto?.randomUUID?.() || `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const upload = {
    id, kind, status: 'saving', createdAt: Date.now(), finishedAt: null,
    postId: null, isProfile, profileUsername, fileName: file.name || 'Media', message: 'Saving privately to this browser…'
  };
  broadcast([...uploads, upload]);

  // This function is deliberately never tied to a React component's mount state.
  const promise = (async () => {
    let attachment;
    try {
      attachment = await storeMedia(file, warning, alt);
      update(id, { status: 'reviewing', message: 'Checking content safety…' });
      // A scanner can only flag for review. Public distribution is never enabled here.
      attachment.moderation = await getModerationSignal(caption, file);
      const post = await onPublish(caption, {
        attachment, reelsOptIn: kind === 'video' && shareToReels, groupId
      });
      if (!post) throw new Error('The post could not be saved. Please try again.');
      update(id, { status: 'complete', postId: String(post.id), finishedAt: Date.now(),
        message: 'Saved privately · Awaiting moderation' });
      return post;
    } catch (error) {
      if (attachment?.id) await removeMedia(attachment.id).catch(() => {});
      update(id, { status: 'error', finishedAt: Date.now(),
        message: error?.message || 'Unable to save this post. Try again.' });
      return null;
    } finally {
      // Keep completion/error visible, but don't accumulate finished uploads forever.
      setTimeout(() => dismissMediaUpload(id), EXPIRE_MS);
    }
  })();
  return { id, promise };
}
