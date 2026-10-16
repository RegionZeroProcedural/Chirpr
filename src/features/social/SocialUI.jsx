import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { REACTIONS, useSocial } from './SocialStore.jsx';

export function SocialNav({ compact = false }) {
  const s = useSocial();
  const pages = [['/feed','⌂','Feed'],['/discover','⌕','Discover'],['/reels','▣','Reels'],['/groups','✳','Groups'],['/notifications','♧',`Activity${s?.unread ? ` (${s.unread})` : ''}`],['/messages','✉','Messages'],['/bookmarks','✧','Saved'],['/account','◉','Profile'],['/settings','⚙','Settings']];
  return <nav className={`chirpr-universal-nav${compact ? ' chirpr-universal-nav--compact' : ''}`} aria-label="Chirpr navigation">{pages.map(([url, icon, label]) => <Link key={url} to={url}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav>;
}
/** Short click = quick like; holding for 420ms reveals emoji reactions.
 * There is also an explicit picker button for keyboard and mouse accessibility. */
export function ReactionControl({ post, compact = false }) {
  const social = useSocial();
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wasHold = useRef(false);
  const root = useRef(null);
  const current = social?.reactionFor(post.id);
  const summary = social?.reactionSummary(post.id) || { counts: {}, total: 0, top: [] };
  const initialLikes = Math.max(0, Number(post.likes) || 0);
  const total = initialLikes + summary.total;
  const visibleKinds = REACTIONS.filter(r => (summary.counts[r.id] || 0) + (r.id === 'like' ? initialLikes : 0) > 0)
    .sort((a,b) => (summary.counts[b.id] || 0) + (b.id === 'like' ? initialLikes : 0) - (summary.counts[a.id] || 0) - (a.id === 'like' ? initialLikes : 0)).slice(0,3);
  const selected = REACTIONS.find(r => r.id === current);
  useEffect(() => {
    if (!open) return undefined;
    const outside = event => { if (root.current && !root.current.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', escape); };
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const stopHold = () => window.clearTimeout(timer.current);
  return <div ref={root} className={`chirpr-reaction${compact ? ' chirpr-reaction--compact' : ''}`}>
    <button type="button" className={`chirpr-reaction__like${current ? ' is-reacted' : ''}`} aria-label={selected ? current === 'like' ? 'Unlike chirp' : `Remove ${selected.label} reaction` : 'Like chirp'} aria-pressed={!!current}
      onPointerDown={event => { if (event.button !== 0) return; wasHold.current = false; stopHold(); timer.current = window.setTimeout(() => { wasHold.current = true; setOpen(true); }, 420); }}
      onPointerUp={stopHold} onPointerCancel={stopHold} onPointerLeave={stopHold} onContextMenu={event => { event.preventDefault(); stopHold(); setOpen(true); }}
      onClick={() => { if (wasHold.current) { wasHold.current = false; return; } social?.reactToPost(post, current || 'like'); }}>
      <span>{selected?.icon || '♡'}</span><span>{selected?.label || 'Like'}</span>
    </button>
    <button className="chirpr-reaction__expand" type="button" aria-label="Choose a reaction" aria-expanded={open} onClick={() => setOpen(v => !v)}>⌄</button>
    {total > 0 && <span className="chirpr-reaction__summary" aria-label={`${total} reactions`}>{visibleKinds.map(r => <span key={r.id} title={`${r.label}: ${(summary.counts[r.id] || 0) + (r.id === 'like' ? initialLikes : 0)}`}>{r.icon}</span>)}<b>{total}</b></span>}
    {open && <div className="chirpr-reaction__picker" role="group" aria-label="React to chirp">{REACTIONS.map(r => <button key={r.id} type="button" title={r.label} aria-label={r.label} aria-pressed={current === r.id} onClick={() => { social?.reactToPost(post, r.id); setOpen(false); }}>{r.icon}</button>)}</div>}
  </div>;
}

export function SocialPostActions({ post, onSave, saved, visual = false }) {
  const s = useSocial();
  const [dialog, setDialog] = useState('');
  const liked = s?.liked(post.id) || false;
  const reposted = s?.reposted(post.originalPostId || post.id) || false;
  const totalLikes = Number(post.likes || 0) + (s?.likeCount(post.id) || 0);
  const totalReplies = Number(post.replies || 0) + (s?.repliesFor(post.id).length || 0);
  const totalReposts = Number(post.shares || 0) + (s?.repostCount(post.id) || 0);
  if (visual) return <footer className="feed-chirp__actions"><span>↶ {totalReplies}</span><span>♡ {totalLikes}</span><span>⇄ {totalReposts}</span><span>✧ {saved ? 'Saved' : 'Save'}</span></footer>;
  return <><footer className="feed-chirp__actions social-chirp-actions">
    <button type="button" onClick={() => setDialog('reply')} aria-label={`Reply to chirp. ${totalReplies} replies`}>↶ {totalReplies}</button>
    <ReactionControl post={post} />
    <button type="button" className={reposted ? 'feed-chirp__liked' : ''} onClick={() => setDialog('repost')} aria-pressed={reposted} aria-label="Rechirp">⇄ {totalReposts}</button>
    <button type="button" onClick={() => setDialog('share')} aria-label="Share chirp">↗ Share</button>
    <button type="button" onClick={() => onSave?.(post.id)} className={saved ? 'feed-chirp__saved' : ''} aria-pressed={!!saved}>✧ {saved ? 'Saved' : 'Save'}</button>
    <button type="button" aria-label="Report chirp" onClick={() => setDialog('report')}>⚑</button>
    <Link className="social-thread-link" aria-label="Open chirp thread" to={`/chirp/${encodeURIComponent(post.id)}`}>↳ Thread</Link>
  </footer>{dialog && <InteractionDialog type={dialog} post={post} close={() => setDialog('')} />}</>;
}

export function InteractionDialog({ post, type, close }) {
  const s = useSocial(); const [text, setText] = useState(''); const [feedback, setFeedback] = useState(''); const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const keyHandler = event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const panel = ref.current?.closest('.social-dialog');
      const focusable = [...(panel?.querySelectorAll('button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled])') || [])];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
    };
    window.addEventListener('keydown', keyHandler);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', keyHandler); if (previous?.isConnected) previous.focus(); };
  }, [close]);
  const submit = e => { e.preventDefault(); if (type === 'reply') { if (s?.addReply(post, text)) close(); } else if (type === 'repost') { s?.toggleRepost(post, text); close(); } else if (type === 'report') { s?.report(post.id, 'post', text); close(); } };
  const copy = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/chirp/${encodeURIComponent(post.id)}`); setFeedback('Link copied.'); } catch { setFeedback('Copy the link from your address bar after opening Thread.'); } };
  return createPortal(<div className="social-dialog-scrim" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><section className={`social-dialog social-dialog--${type}`} role="dialog" aria-modal="true" aria-labelledby="social-dialog-title"><div className="social-dialog__head"><span>✳ CHIRPR / CONVERSATION</span><button ref={ref} type="button" onClick={close} aria-label="Close dialog">✕</button></div><h2 id="social-dialog-title">{type === 'reply' ? 'Keep the conversation going.' : type === 'repost' ? 'Pass it along.' : type === 'report' ? 'Report this chirp' : 'Share a little thought.'}</h2><blockquote>{post.text}</blockquote>{type === 'share' ? <div className="social-dialog__actions"><button onClick={copy}>↗ Copy link</button><Link onClick={close} to={`/chirp/${encodeURIComponent(post.id)}`}>View conversation →</Link></div> : <form onSubmit={submit}>{(type !== 'repost' || !s?.reposted(post.originalPostId || post.id)) && <textarea aria-label={type === 'report' ? 'Reason for report' : 'Your reply'} required={type !== 'repost'} autoFocus maxLength={500} value={text} onChange={e => setText(e.target.value)} placeholder={type === 'reply' ? 'Add your perspective…' : type === 'repost' ? 'Add your own thought above this rechirp (optional)…' : 'Describe your concern…'} />}{type === 'repost' && <p>{s?.reposted(post.originalPostId || post.id) ? 'Undo your rechirp?' : 'Add commentary or share as-is. Your thought appears above the original post.'}</p>}<button type="submit" className="chirpr-hover-glow">{type === 'repost' ? (s?.reposted(post.originalPostId || post.id) ? 'Undo rechirp' : 'Rechirp') : type === 'report' ? 'Submit report' : 'Reply'} ↗</button></form>}{feedback && <p role="status">{feedback}</p>}</section></div>,document.body);
}

export function SocialDock() {
  const location = useLocation();
  if (location.pathname.startsWith('/reels') || ['/','/home','/login','/register','/about'].includes(location.pathname)) return null;
  return <nav className="social-dock" aria-label="Mobile navigation">{[['/feed','⌂','Feed'],['/discover','⌕','Discover'],['/reels','▣','Reels'],['/notifications','♧','Activity'],['/messages','✉','Messages'],['/account','◉','Profile']].map(([url,icon,label])=><Link key={url} className={location.pathname === url ? 'is-active' : ''} to={url}><span>{icon}</span>{label}</Link>)}</nav>;
}
