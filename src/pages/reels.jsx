import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_APPEARANCE, hexToHue, normalizeAppearance } from '../data/accountAppearance.js';
import { readMedia } from '../data/mediaVault.js';
import LinkedPostText from '../components/LinkedPostText.jsx';
import { SocialPostActions } from '../features/social/SocialUI.jsx';
import { useSocial } from '../features/social/SocialStore.jsx';

function VideoReel({ post, author, appearance, index, privatePreview, onSavePost, saved }) {
  const social = useSocial();
  const videoRef = useRef(null);
  const targetRef = useRef(null);
  const [src, setSrc] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [muted, setMuted] = useState(true);
  const [inView, setInView] = useState(false);
  const normalized = normalizeAppearance(appearance ?? DEFAULT_APPEARANCE);
  useEffect(() => {
    let alive = true, objectUrl = '';
    readMedia(post.attachment.id).then(blob => { if (alive && blob) { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); } }).catch(() => {});
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [post.attachment.id]);
  useEffect(() => {
    if (!targetRef.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => setInView(entries[0].intersectionRatio >= .62), { threshold: [.05,.62,.85] });
    observer.observe(targetRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!videoRef.current) return;
    if (!inView || !revealed) videoRef.current.pause();
    else if (!social?.prefs.muteAutoplay) videoRef.current.play().catch(() => {});
  }, [inView, revealed, src, social?.prefs.muteAutoplay]);
  const reason = post.attachment.warning || (privatePreview ? 'Pending moderation — no public approval' : 'Content notice');
  return <article className="chirpr-native-reel" ref={targetRef} style={{ '--reel-accent': normalized.color, '--reel-hue': hexToHue(normalized.color) }}>
    <div className="chirpr-native-reel__scene"><i /><i /><i /></div>
    <div className="chirpr-native-reel__frame">
      {src ? <video ref={videoRef} src={src} muted={muted} playsInline loop preload="metadata" className={!revealed ? 'is-obscured' : ''} onClick={event => event.currentTarget.paused ? event.currentTarget.play() : event.currentTarget.pause()} /> : <div className="chirpr-native-reel__loading">◈ Loading local media…</div>}
      {!revealed && <div className="chirpr-native-reel__warning"><span>◈ CONTENT NOTICE</span><h3>{reason}</h3><p>{privatePreview ? 'This video is private to this browser until reviewed by the future moderation service.' : 'Review this content before playing.'}</p><button className="chirpr-hover-glow" type="button" onClick={() => setRevealed(true)}>Show video ↗</button></div>}
      {revealed && <><span className="chirpr-native-reel__tap">Tap video to pause or resume</span><button type="button" className="chirpr-native-reel__sound" onClick={() => { setMuted(m => !m); videoRef.current?.play().catch(() => {}); }}>{muted ? '♫ Unmute' : '♫ Mute'}</button></>}
      <div className="chirpr-native-reel__caption"><span>✦ CHIRPR REELS / {String(index + 1).padStart(2,'0')}</span><Link to={`/users/${author?.username}`}>@{author?.username || 'community'}</Link><p><LinkedPostText text={post.text} /></p><small>{privatePreview ? '◷ Awaiting review · Private preview' : '✓ Approved for public reels'}</small></div>
    </div>
    <div className="chirpr-reel__social"><SocialPostActions post={post} saved={saved} onSave={onSavePost} /></div>
  </article>;
}

export default function Reels({ currentUser, users = [], localChirps = [], appearancesByUid = {}, postPreferences = { saved: [] }, onSavePost }) {
  const [view, setView] = useState('community');
  // Fail closed: only items with an explicit server-issued approval can join the public feed.
  // The current demo does NOT issue approvals; unreviewed uploads are private previews only.
  const opted = localChirps.filter(post => post.reelsOptIn && post.attachment?.kind === 'video');
  const reels = view === 'community' ? opted.filter(post => post.attachment?.moderation?.status === 'approved') : opted.filter(post => String(post.uid) === String(currentUser?.uid));
  return <main className="reels-page reels-page--portal-enter chirpr-native-reels">
    <div className="reels-page__atmosphere" aria-hidden="true"><i /><i /><i /></div>
    <header className="reels-topbar"><Link to="/feed" className="feed-wordmark"><span className="feed-wordmark__icon" aria-hidden="true" /> chirpr<span>.</span></Link><span>✧ REAL CREATORS / CHIRPR ORIGINALS</span><Link to="/feed">← Back to feed</Link></header>
    <div className="chirpr-native-reels__layout">
      <aside className="chirpr-native-reels__sidebar"><span>◈ CHIRPR / ORIGINALS</span><h1>Real moments.<br /><em>Our world.</em></h1><p>No imported platform feeds. Reels are videos creators upload directly to Chirpr and explicitly choose to share.</p>
        <div className="chirpr-native-reels__switch"><button type="button" className={view==='community' ? 'is-active' : ''} onClick={() => setView('community')}>✧ Community reels</button><button type="button" className={view==='mine' ? 'is-active' : ''} onClick={() => setView('mine')}>◉ My submissions</button></div>
        <div className="chirpr-native-reels__notice"><b>◈ SAFETY FIRST</b><p>Public reels remain empty until an authenticated server moderation pipeline approves uploads. Your personal submissions are available as local blurred previews.</p></div><Link className="chirpr-native-reels__cta chirpr-hover-glow" to="/account">＋ Upload from your profile ↗</Link><Link className="chirpr-native-reels__group" to="/groups">✳ Explore groups</Link>
      </aside>
      <section className="chirpr-native-reels__stream" aria-label={view === 'community' ? 'Approved community reels' : 'My reel submissions'}>
        {reels.length ? reels.map((post, index) => <VideoReel key={post.id} post={post} author={users.find(user => String(user.uid) === String(post.uid))} appearance={appearancesByUid[String(post.uid)]} index={index} privatePreview={view === 'mine' && post.attachment?.moderation?.status !== 'approved'} onSavePost={onSavePost} saved={postPreferences.saved?.includes(String(post.id))} />) : <div className="chirpr-native-reels__empty"><span>✳</span><h2>{view === 'mine' ? 'Your first reel awaits.' : 'A fresh canvas.'}</h2><p>{view === 'mine' ? 'On your profile, attach a video and turn on “Also submit to Chirpr Reels.”' : 'This feed will fill with approved user-uploaded videos once server moderation is online.'}</p><Link to="/account">Go to your profile ↗</Link></div>}
      </section>
    </div>
  </main>;
}
