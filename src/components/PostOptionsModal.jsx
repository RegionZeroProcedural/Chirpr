import { useSocial } from '../features/social/SocialStore.jsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { hexToHue, normalizeAppearance, THEME_PRESETS } from '../data/accountAppearance.js';

/** One accessible dialog for every chirp. Rendered outside the shard layers. */
export default function PostOptionsModal({ post, author, currentUser, appearance, saved, onClose, onEdit, onDelete, onHide, onSave }) {
  const social = useSocial();
  const [reportReason, setReportReason] = useState('Harassment or bullying');
  const [reportDetails, setReportDetails] = useState('');
  const [closing, setClosing] = useState(false);
  const [mode, setMode] = useState('options');
  const [draft, setDraft] = useState(post.text);
  const [message, setMessage] = useState('');
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const owner = Boolean(currentUser && String(currentUser.uid) === String(post.uid));
  const theme = normalizeAppearance(appearance);
  const themeLabel = THEME_PRESETS.find(preset => preset.id === theme.theme)?.label ?? 'Aurora';

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => { document.body.style.overflow = oldOverflow; window.cancelAnimationFrame(focusTimer); };
  }, []);

  useEffect(() => {
    const handler = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (mode === 'options') setClosing(true); else { setMode('options'); setMessage(''); }
      }
      if (event.key === 'Tab' && panelRef.current) {
        const nodes = [...panelRef.current.querySelectorAll('button:not(:disabled), a[href], textarea:not(:disabled)')];
        if (!nodes.length) return;
        if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
        if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0].focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mode]);

  useEffect(() => {
    if (!closing) return;
    const timeout = window.setTimeout(onClose, 220);
    return () => window.clearTimeout(timeout);
  }, [closing, onClose]);

  async function copyLink() {
    const address = `${window.location.origin}/users/${author?.username || 'unknown'}#chirp-${encodeURIComponent(post.id)}`;
    try {
      await navigator.clipboard.writeText(address);
      setMessage('Link copied to your clipboard.');
    } catch {
      // Clipboard access may be blocked outside HTTPS/localhost.
      setMessage(`Copy this link: ${address}`);
    }
  }
  function saveChanges(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!owner || !text || text === post.text) { if (text === post.text) setClosing(true); return; }
    onEdit?.(post.id, text);
    setClosing(true);
  }
  function removePost() {
    if (!owner) return;
    onDelete?.(post.id);
    setClosing(true);
  }
  function hidePost() { onHide?.(post.id); setClosing(true); }
  function toggleSave() {
    if (!currentUser) { setMessage('Log in to save chirps.'); return; }
    onSave?.(post.id);
    setMessage(saved ? 'Removed from your saved chirps.' : 'Saved to this browser.');
  }

  return createPortal(
    <div className={`chirp-options-backdrop${closing ? ' chirp-options-backdrop--closing' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) setClosing(true); }}>
      <section ref={panelRef} className={`chirp-options chirp-options--${theme.theme}`} role="dialog" aria-modal="true" aria-labelledby="chirp-options-title" aria-describedby="chirp-options-description" style={{ '--chirp-accent': theme.color, '--chirp-hue': hexToHue(theme.color) }}>
        <div className="chirp-options__glint" aria-hidden="true" />
        <header className="chirp-options__header">
          <span className="chirp-options__eyebrow">✦ CHIRPR / YOUR SPACE</span>
          <button className="chirp-options__close" type="button" aria-label="Close post options" ref={closeRef} onClick={() => setClosing(true)}>×</button>
        </header>
        <div className="chirp-options__identity">
          <span className="chirp-options__avatar" aria-hidden="true">{(author?.displayName ?? 'C')[0]}</span>
          <div><h2 id="chirp-options-title">{mode === 'edit' ? 'Edit your chirp' : mode === 'delete' ? 'Delete this chirp?' : mode === 'report' ? 'Report this chirp' : 'Chirp options'}</h2><p id="chirp-options-description">@{author?.username ?? 'community'} <span>·</span> {themeLabel} atmosphere</p></div>
        </div>
        <div className="chirp-options__divider" />
        {mode === 'options' && (
          <div className="chirp-options__menu">
            {owner ? <>
              <button className="chirp-options__item" type="button" onClick={() => setMode('edit')}><span className="chirp-options__icon">✎</span><span><strong>Edit chirp</strong><small>Update what you shared</small></span><b>↗</b></button>
              <button className="chirp-options__item" type="button" onClick={() => setMode('delete')}><span className="chirp-options__icon chirp-options__icon--danger">⌫</span><span><strong>Delete chirp</strong><small>Remove it from the demo feed</small></span><b>↗</b></button>
            </> : <>
              {author?.username && <Link className="chirp-options__item" to={`/users/${author.username}`} onClick={() => setClosing(true)}><span className="chirp-options__icon">◉</span><span><strong>View @{author.username}</strong><small>Explore their personalized profile</small></span><b>↗</b></Link>}
              <button className="chirp-options__item" type="button" onClick={hidePost}><span className="chirp-options__icon">◌</span><span><strong>Hide this chirp</strong><small>Remove it from your preview</small></span><b>↗</b></button>
              <button className="chirp-options__item" type="button" onClick={() => setMode('report')}><span className="chirp-options__icon">⚑</span><span><strong>Report chirp</strong><small>Submit a local moderation report</small></span><b>↗</b></button>
              <button className="chirp-options__item" type="button" onClick={() => { social?.toggleSafety('muted', post.uid); setClosing(true); }}><span className="chirp-options__icon">◌</span><span><strong>{social?.isMuted(post.uid) ? 'Unmute' : 'Mute'} @{author?.username}</strong><small>Update your content preferences</small></span><b>↗</b></button>
              <button className="chirp-options__item" type="button" onClick={() => { social?.toggleSafety('blocked', post.uid); setClosing(true); }}><span className="chirp-options__icon">⊘</span><span><strong>{social?.isBlocked(post.uid) ? 'Unblock' : 'Block'} @{author?.username}</strong><small>Control who appears in your feed</small></span><b>↗</b></button>
            </>}
            <div className="chirp-options__divider chirp-options__divider--thin" />
            <button className="chirp-options__item" type="button" onClick={toggleSave}><span className="chirp-options__icon">{saved ? '✦' : '✧'}</span><span><strong>{saved ? 'Unsave chirp' : 'Save chirp'}</strong><small>{saved ? 'Remove from your saved items' : 'Keep this thought close'}</small></span><b>↗</b></button>
            <button className="chirp-options__item" type="button" onClick={copyLink}><span className="chirp-options__icon">↗</span><span><strong>Copy chirp link</strong><small>Share this thought with a friend</small></span><b>↗</b></button>
          </div>
        )}
        {mode === 'edit' && (
          <form className="chirp-options__edit" onSubmit={saveChanges}>
            <label htmlFor="chirp-options-edit">Your thought</label>
            <textarea id="chirp-options-edit" value={draft} onChange={event => setDraft(event.target.value)} maxLength={500} rows={5} autoFocus />
            <span>{draft.length} / 500 characters</span>
            <div className="chirp-options__buttons"><button type="button" onClick={() => setMode('options')}>Cancel</button><button className="chirp-options__primary chirpr-hover-glow" type="submit" disabled={!draft.trim()}>Save changes ↗</button></div>
          </form>
        )}
        {mode === 'report' && (
          <form className="chirp-options__edit" onSubmit={event => { event.preventDefault(); social?.report(post.id, 'post', reportReason, reportDetails); setClosing(true); }}>
            <label htmlFor="report-reason">Why are you reporting this?</label>
            <select id="report-reason" value={reportReason} onChange={event => setReportReason(event.target.value)}>{['Harassment or bullying','Hateful conduct','Violence or threats','Sexual content','Spam or impersonation','Other safety concern'].map(reason => <option key={reason}>{reason}</option>)}</select>
            <label htmlFor="report-details">Details (optional)</label>
            <textarea id="report-details" maxLength={500} rows={3} value={reportDetails} onChange={event => setReportDetails(event.target.value)} />
            <small>Saved to this browser for UI testing. Not reviewed by a live moderation team.</small>
            <div className="chirp-options__buttons"><button type="button" onClick={() => setMode('options')}>Back</button><button type="submit" className="chirp-options__primary chirpr-hover-glow">Submit report</button></div>
          </form>
        )}
        {mode === 'delete' && (
          <div className="chirp-options__confirm"><p>This removes your chirp from this browser's demo feed. This cannot be undone here.</p><div className="chirp-options__buttons"><button type="button" onClick={() => setMode('options')}>Cancel</button><button className="chirp-options__danger" type="button" onClick={removePost}>Delete chirp</button></div></div>
        )}
        <div className="chirp-options__footer"><span className="chirp-options__status" role="status" aria-live="polite">{message}</span><span>✧ {owner ? 'YOUR CHIRP' : 'THEIR CHIRP'}</span></div>
      </section>
    </div>, document.body
  );
}
