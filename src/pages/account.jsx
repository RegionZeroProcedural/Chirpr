import { useSocial } from '../features/social/SocialStore.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { demoFeed } from '../data/demoFeed.js';
import { getRechirps } from '../data/rechirps.js';
import { FragmentChirp, TextChirpFlightOverlay } from './feed.jsx';
import { useTextChirpFlight } from '../components/useTextChirpFlight.js';
import PostOptionsModal from '../components/PostOptionsModal.jsx';
import { usePostDestruction } from '../components/usePostDestruction.js';
import { useFeedReflow } from '../components/useFeedReflow.js';
import { applyPostPreferences } from '../data/postPreferences.js';
import { useScrollFragments } from '../components/useScrollFragments.js';
import EditProfileSettingsButton from '../components/editProfileSettingsButton.jsx';
import EditProfileDetailsButton from '../components/editProfileDetailsButton.jsx';
import { DEFAULT_APPEARANCE, hexToHue, normalizeAppearance, THEME_PRESETS } from '../data/accountAppearance.js';
import AccountAtmosphere from '../components/AccountAtmosphere.jsx';
import ProfileReveal from '../components/ProfileReveal.jsx';
import MediaUploadModal from '../components/MediaUploadModal.jsx';
import MentionSuggestions from '../components/MentionSuggestions.jsx';
import MentionTextarea from '../components/MentionTextarea.jsx';

function hexToHsl(hex) {
  const values = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = values;
  const max = Math.max(...values), min = Math.min(...values);
  let hue = hexToHue(hex), saturation = 0;
  const lightness = (max + min) / 2;
  const difference = max - min;
  if (difference) saturation = difference / (1 - Math.abs(2 * lightness - 1));
  return { h: hue, s: saturation, l: lightness };
}
function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function AppearanceEditor({ appearance, onChange, onClose, username }) {
  const wheelRef = useRef(null);
  const pickerRef = useRef(null);
  const hue = hexToHue(appearance.color);
  const selected = THEME_PRESETS.find(item => item.id === appearance.theme) ?? THEME_PRESETS[0];

  useEffect(() => {
    const dismiss = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [onClose]);

  const changeHue = next => {
    const { s, l } = hexToHsl(appearance.color);
    onChange({ ...appearance, color: hslToHex((next + 360) % 360, s, l) });
  };
  const pointToHue = event => {
    const box = wheelRef.current.getBoundingClientRect();
    const x = event.clientX - box.left - box.width / 2;
    const y = event.clientY - box.top - box.height / 2;
    changeHue(Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360));
  };
  return (
    <div className="account-editor-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="account-editor" role="dialog" aria-modal="true" aria-label={`Personalize @${username}'s profile`}>
        <div className="account-editor__head">
          <div><span className="account-eyebrow">✳ YOUR SPACE, YOUR STYLE</span><h2>Personalize <em>your account.</em></h2><p>Give your corner of Chirpr a look of its own.</p></div>
          <button className="account-editor__close" type="button" onClick={onClose} aria-label="Close personalization">✕</button>
        </div>
        <div className="account-editor__label"><span>01 / BACKGROUND THEME</span><small>{selected.label} selected</small></div>
        <div className="account-editor__themes" role="group" aria-label="Background themes">
          {THEME_PRESETS.map(item => (
            <button type="button" key={item.id} className={`account-theme-option account-theme-option--${item.id}${appearance.theme === item.id ? ' account-theme-option--selected' : ''}`} onClick={() => onChange({ ...appearance, theme: item.id })} aria-pressed={appearance.theme === item.id}>
              <span className="account-theme-option__art"><i /><b>{item.glyph}</b><i /></span>
              <strong>{item.label}</strong><small>{item.subtitle}</small>
              <span className="account-theme-option__check" aria-hidden="true">{appearance.theme === item.id ? '✓' : ''}</span>
            </button>
          ))}
        </div>
        <div className="account-editor__color-section">
          <div className="account-editor__label"><span>02 / ACCENT & BACKGROUND HUE</span><small>Choose any color</small></div>
          <div className="account-editor__color-content">
            <div className="account-color-wheel" ref={wheelRef} role="slider" tabIndex={0} aria-label="Choose background hue" aria-valuemin={0} aria-valuemax={359} aria-valuenow={hue} aria-valuetext={`${hue} degrees`} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); pointToHue(event); }} onPointerMove={event => { if (event.buttons & 1) pointToHue(event); }} onKeyDown={event => { if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key)) { event.preventDefault(); changeHue(hue + (event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1)); } }}>
              <span className="account-color-wheel__inner" style={{ '--wheel-color': appearance.color }}><span>✳</span></span>
              <span className="account-color-wheel__knob" style={{ transform: `rotate(${hue}deg) translateX(82px)` }} />
            </div>
            <div className="account-color-settings">
              <p>Drag around the wheel to set the hue. Use the color picker to fine-tune brightness and saturation.</p>
              <div className="account-color-settings__value"><span className="account-color-settings__swatch" style={{ backgroundColor: appearance.color }} /><strong>{appearance.color}</strong><button type="button" onClick={() => pickerRef.current?.click()}>Pick color ↗</button></div>
              <label className="account-color-settings__picker">Precise color <input ref={pickerRef} type="color" value={appearance.color} onChange={event => onChange({ ...appearance, color: event.target.value.toUpperCase() })} aria-label="Precise background color picker" /></label>
              <small>Theme and hue are saved separately for each account in this demo browser.</small>
            </div>
          </div>
        </div>
        <div className="account-editor__footer"><button type="button" className="account-editor__reset" onClick={() => onChange({ ...DEFAULT_APPEARANCE })}>↺ Reset to default</button><button type="button" className="account-editor__done chirpr-hover-glow" onClick={onClose}>Done <span>↗</span></button></div>
      </section>
    </div>
  );
}

export default function Account({ currentUser, users, appearancesByUid = {}, onAppearanceChange = () => {}, localChirps = [], onCreateChirp, postPreferences, onEditPost, onDeletePost, onHidePost, onSavePost }) {
  const social = useSocial();
  const { uname } = useParams();
  const location = useLocation();
  const profileUser = uname ? users.find(user => user.username.toLowerCase() === uname.toLowerCase()) : (currentUser || users[0]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [activeTab, setActiveTab] = useState('chirps');
  const [draft, setDraft] = useState('');
  const [caret, setCaret] = useState(0);
  const [uploadOrigin, setUploadOrigin] = useState(null);
  const [composerCycle, setComposerCycle] = useState(0);
  const [postAnnouncement, setPostAnnouncement] = useState('');
  const [optionPost, setOptionPost] = useState(null);
  const optionTrigger = useRef(null);
  const openOptions = (post, trigger) => { optionTrigger.current = trigger; setOptionPost(post); };
  const closeOptions = () => { setOptionPost(null); window.requestAnimationFrame(() => optionTrigger.current?.isConnected && optionTrigger.current.focus()); };
  const composeRef = useRef(null);
  const draftRef = useRef(null);
  const streamRef = useRef(null);
  const { begin: beginTextFlight, pendingFlight, flight, arrivingId, justPostedId, reset: resetTextFlight } = useTextChirpFlight(streamRef, localChirps.map(post => post.id).join("|"));
  const uid = profileUser?.uid;
  const appearance = normalizeAppearance(appearancesByUid[String(uid)] ?? DEFAULT_APPEARANCE);
  const owner = !!currentUser && currentUser.uid === uid;
  const themeName = THEME_PRESETS.find(item => item.id === appearance.theme)?.label ?? 'Aurora';
  const posts = useMemo(() => {
    if (!profileUser) return [];
    const originals = [
      ...localChirps.filter(post => String(post.uid) === String(uid) && !post.groupId),
      ...(profileUser.chirps?.length ? profileUser.chirps : demoFeed.filter(post => String(post.uid) === String(uid)))
    ];
    return applyPostPreferences(originals, postPreferences);
  }, [localChirps, postPreferences, profileUser, uid]);
  const allOriginals = useMemo(() => [...localChirps.filter(post => !post.groupId), ...demoFeed], [localChirps]);
  const myRechirps = useMemo(() => applyPostPreferences(
    getRechirps(allOriginals, social?.state.reposts, social?.state.repostNotes, users)
      .filter(post => String(post.uid) === String(uid)), postPreferences
  ), [allOriginals, social?.state.reposts, social?.state.repostNotes, users, uid, postPreferences]);
  const visiblePosts = activeTab === 'rechirps' ? myRechirps : activeTab === 'media'  ? posts.filter(post => !!post.media || !!post.attachment) :
    activeTab === 'likes' ? applyPostPreferences([...localChirps.filter(post => !post.groupId), ...demoFeed], postPreferences).filter(post => (social?.state.likes[String(post.id)] || []).some(uid => String(uid) === String(profileUser?.uid))) : posts;
  const { captureBeforeRemoval } = useFeedReflow(streamRef, `${uid}:${activeTab}:${visiblePosts.map(post => post.id).join('|')}`);
  const { destroying, animateDelete, animateHide } = usePostDestruction(
    id => { captureBeforeRemoval(); if (!social?.removeRepost?.(id)) onDeletePost?.(id); },
    id => { captureBeforeRemoval(); onHidePost?.(id); }
  );
  useScrollFragments(streamRef, `${uid}:${activeTab}:${visiblePosts.map(post => `${post.id}:${post.text}`).join("|")}`);

  useEffect(() => {
    window.scrollTo(0, 0);
    setEditorOpen(false);
    setActiveTab('chirps');
    setDraft('');
    setUploadOrigin(null);
    resetTextFlight();
    setOptionPost(null);
  }, [uid]);
  // A copied chirp link lands on the individual post, even after profile navigation.
  useEffect(() => {
    if (!location.hash.startsWith('#chirp-')) return;
    const hash = decodeURIComponent(location.hash.slice(1));
    const timer = window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    return () => window.clearTimeout(timer);
  }, [uid, location.hash]);
  useEffect(() => { document.body.style.overflow = editorOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [editorOpen]);

  const updateAppearance = next => { if (owner) onAppearanceChange(uid, next); };
  const toggleLike = id => setLikedIds(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  function submitProfileChirp(event) {
    event.preventDefault();
    if (!owner || activeTab !== 'chirps' || !onCreateChirp || pendingFlight || flight) return;
    const text = draft.trim();
    if (!text) return;
    const rect = composeRef.current?.getBoundingClientRect();
    const post = onCreateChirp(text);
    if (!post) return;
    setDraft('');
    setCaret(0);
    setComposerCycle(previous => previous + 1); // A fresh composer blooms above the new post.
    setPostAnnouncement('Your chirp is joining your profile.');
    beginTextFlight(post, rect);
  }

  useEffect(() => {
    if (justPostedId != null) setPostAnnouncement('Chirp posted to your profile.');
  }, [justPostedId]);

  if (!profileUser) return <main className="account-not-found"><h1>Profile not found.</h1><Link to="/feed">← Back to Chirpr</Link></main>;
  return (
    <main className={`account-page account-page--${appearance.theme}`} data-profile-theme={appearance.theme} style={{ '--profile-hue': hexToHue(appearance.color), '--profile-accent': appearance.color }}>
      <AccountAtmosphere />
      <ProfileReveal key={`${location.key}:${uid}`} name={profileUser.username} />
      <header className="account-topbar"><div className="account-topbar__inner"><Link to="/feed" className="feed-wordmark"><span className="feed-wordmark__icon"></span> chirpr<span>.</span></Link><div className="account-topbar__center"><span className="account-topbar__dot" /> A SPACE OF THEIR OWN</div><nav aria-label="Account navigation"><Link to="/feed">⌂ Feed</Link><Link to="/reels">▣ Reels</Link>{currentUser ? <Link to={`/users/${currentUser.username}`}>◉ My profile</Link> : <Link to="/login">↗ Log in</Link>}</nav></div></header>
      <div className="account-layout">
        <aside className="account-sidebar account-sidebar--left"><div className="account-sidebar__sticky"><span className="account-sidebar__eyebrow">EXPLORE CHIRPR</span><Link className="account-sidebar__nav" to="/feed">⌂ <span>For you</span></Link><Link className="account-sidebar__nav" to="/reels">▣ <span>Reels</span></Link><Link className="account-sidebar__nav" to="/groups">✳ <span>Groups</span></Link><Link className="account-sidebar__nav account-sidebar__nav--active" to={`/users/${profileUser.username}`}>◉ <span>This profile</span><i /></Link><div className="account-side-quote"><span>✧</span><p>A little thought.<br /><strong>A bigger connection.</strong></p></div><div className="account-sidebar__foot">CHIRPR / YOUR CORNER<br />© {new Date().getFullYear()}</div></div></aside>
        <div className="account-content">
          <div className="account-breadcrumb"><Link to="/feed">← Back to feed</Link><span>/</span><span>@{profileUser.username}</span><span className="account-breadcrumb__theme">✦ {themeName} theme</span></div>
          <section className="account-cover" aria-label={`${profileUser.displayName}'s chosen ${themeName} background`}>
            {profileUser.bannerImage && <img className="account-cover__uploaded" src={profileUser.bannerImage} alt="" />}
            <div className="account-cover__stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div><div className="account-cover__halo" aria-hidden="true"><i /><i /><i /></div><span className="account-cover__tag">✳ PERSONALLY CURATED</span><div className="account-cover__art" aria-hidden="true"><span>✧</span><i /></div><span className="account-cover__mark">CHIRPR / @{profileUser.username.toUpperCase()}</span>
          </section>
          <section className="account-identity">
            <div className="account-identity__top"><div className="account-avatar" aria-label={`${profileUser.displayName}'s avatar`}>{profileUser.avatarImage ? <img className="account-avatar__uploaded" src={profileUser.avatarImage} alt="" /> : <span>{profileUser.displayName?.[0] || "?"}</span>}<i /></div><div className="account-identity__actions">{owner ? <><button className="account-personalize chirpr-hover-glow" type="button" onClick={() => setEditorOpen(true)}><span>✳</span> Personalize account</button><EditProfileDetailsButton currentUser={currentUser} /></> : <button className="account-follow" type="button" onClick={() => social?.toggleFollow(profileUser.uid)}>{social?.following(profileUser.uid) ? "✓ Following" : "＋ Follow"}</button>}</div></div>
            <div className="account-identity__name"><span className="account-eyebrow">✦ PUBLIC PROFILE</span><h1>{profileUser.displayName}<span className="account-identity__badge" aria-label="Chirpr member">✳</span></h1><p>@{profileUser.username}{profileUser.pronouns && <span className="account-identity__pronouns"> · {profileUser.pronouns}</span>}</p></div>
            <p className="account-identity__bio">{profileUser.bio || 'No bio yet. A little mystery is nice, too.'}</p>
            <div className="account-identity__meta"><span>◷ Joined {profileUser.joined || 'Chirpr'}</span>{profileUser.location && <span>⌖ {profileUser.location}</span>}{profileUser.website && <a href={/^https?:\/\//i.test(profileUser.website) ? profileUser.website : `https://${profileUser.website}`} target="_blank" rel="noopener noreferrer">↗ Website</a>}<span>◈ {themeName} atmosphere</span><span>✧ A little thought, a bigger connection</span></div>
            <div className="account-identity__stats"><span><strong>{posts.length}</strong> Chirps</span><span><strong>{social?.followCount(uid) || 0}</strong> Following</span><span><strong>{social?.followingCount(uid) || 0}</strong> Followers</span></div>
          </section>
          <div className="account-tabs" role="tablist" aria-label={`${profileUser.displayName}'s profile posts`}>
            {[
              { id: 'chirps', label: '✦ Chirps' },
              { id: 'media', label: '◈ Media' },
              { id: 'rechirps', label: '⇄ Rechirps' },
              { id: 'likes', label: '♡ Likes' }
            ].map(tab => <button key={tab.id} type="button" role="tab" id={`account-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls="account-posts-panel" className={activeTab === tab.id ? 'account-tabs__active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
          </div>
          {owner && activeTab === 'chirps' && (
            <section className="account-composer" aria-label="Create a chirp" ref={composeRef}>
              <div className="account-composer__shine" aria-hidden="true" />
              <form key={composerCycle} className={`account-composer__form${composerCycle ? ' account-composer__form--fresh' : ''}`} onSubmit={submitProfileChirp}>
                <div className="account-composer__top">
                  <span className="account-composer__avatar">{currentUser.displayName.charAt(0)}</span>
                  <div><span className="account-eyebrow">✳ A THOUGHT FROM YOU</span><h2>Make a little noise<span>.</span></h2></div>
                  <span className="account-composer__status"><i /> Your space</span>
                </div>
                <label className="account-composer__label" htmlFor="account-new-chirp">What's on your mind?</label>
                <MentionTextarea ref={draftRef} id="account-new-chirp" value={draft} onChange={event => { setDraft(event.target.value); setCaret(event.target.selectionStart); }} onKeyUp={event => setCaret(event.target.selectionStart)} maxLength={500} rows={3} placeholder="A little thought can go a long way..." />
                <MentionSuggestions text={draft} caret={caret} users={users} onSelect={(username, mention) => { const nextCaret = mention.start + username.length + 2; setDraft(previous => previous.slice(0, mention.start) + `@${username} ` + previous.slice(mention.end)); setCaret(nextCaret); requestAnimationFrame(() => { draftRef.current?.focus(); draftRef.current?.setSelectionRange(nextCaret, nextCaret); }); }} />
                <div className="account-composer__footer"><button className="chirpr-upload-trigger" type="button" onClick={event => setUploadOrigin(event.currentTarget.getBoundingClientRect())}>▧ Add photo / video</button><span className="account-composer__hint">✧ WATCH YOUR CHIRP TAKE SHAPE</span><div><span className="account-composer__count">{draft.length} / 500</span><button className="account-composer__post chirpr-hover-glow" type="submit" disabled={!draft.trim() || !!pendingFlight || !!flight}>Post chirp <span aria-hidden="true">↗</span></button></div></div>
              </form>
              <span className="account-composer__live" role="status" aria-live="polite">{postAnnouncement}</span>
            </section>
          )}
          <section id="account-posts-panel" role="tabpanel" aria-labelledby={`account-tab-${activeTab}`}>
            <div className="account-stream-heading"><span><i /> {activeTab === 'chirps' ? 'THE CONVERSATION' : activeTab === 'media' ? 'SHARED MOMENTS' : activeTab === 'rechirps' ? 'SHARED AGAIN' : 'FAVORITE THOUGHTS'}</span><small>SCROLL TO WATCH CHIRPS ASSEMBLE ↓</small></div>
            <div className="account-stream" ref={streamRef}>
              {visiblePosts.length ? visiblePosts.map((post, index) => (
                <div key={post.id || index} id={`chirp-${post.id}`} data-post-id={String(post.id)} data-feed-reflow-item data-new-chirp={post.id} data-chirp-entry-target={String(post.id)} className={`account-stream-post${arrivingId === post.id ? ' account-stream-post--awaiting' : ''}${justPostedId === post.id ? ' account-stream-post--landed' : ''}`}>
                  <FragmentChirp post={post} author={users.find(person => String(person.uid) === String(post.uid))} appearance={appearancesByUid[String(post.uid)]} liked={likedIds.has(post.id)} onLike={toggleLike} saved={postPreferences.saved.includes(String(post.id))} onSave={currentUser ? onSavePost : undefined} onOpenOptions={openOptions} destruction={destroying[String(post.id)]} viewerUid={currentUser?.uid} />
                </div>
              )) : <div className="account-empty">{activeTab === 'chirps' ? 'No chirps yet. Every story starts somewhere. ✦' : activeTab === 'media' ? 'No media chirps here yet. ✦' : activeTab === 'rechirps' ? 'No rechirps shared yet. ⇄' : 'Like a chirp to see it here. ♡'}</div>}
            </div>
          </section>
          <div className="account-end"><span>✳</span><h2>That's their story, <em>so far.</em></h2><p>Even the smallest thought can start something big.</p><Link to="/feed">Explore more chirps ↗</Link></div>
        </div>
        <aside className="account-sidebar account-sidebar--right"><div className="account-sidebar__sticky"><section className="account-vibe"><span>✦ THEIR ATMOSPHERE</span><div className={`account-vibe__mini account-vibe__mini--${appearance.theme}`}><i /><b>✳</b></div><h2>{themeName}</h2><p>Every profile has its own atmosphere. The theme and hue you see belong to <strong>@{profileUser.username}</strong>.</p>{owner && <button type="button" onClick={() => setEditorOpen(true)}>Customize your space ↗</button>}</section><section className="account-explore"><h3>MORE PEOPLE <span>✧</span></h3>{users.filter(person => person.uid !== uid).map((person, i) => <Link to={`/users/${person.username}`} key={person.uid}><span className={`feed-avatar feed-avatar--${i ? 'cyan' : 'violet'}`}>{person.displayName[0]}</span><span><strong>{person.displayName}</strong><small>@{person.username}</small></span><b>↗</b></Link>)}</section><div className="account-right-note">This is a frontend preview. Personalization is saved by user ID in this browser.</div>{owner && <div className="account-manage"><EditProfileSettingsButton currentUser={currentUser} /></div>}</div></aside>
      </div>
      {uploadOrigin && owner && activeTab === 'chirps' && <MediaUploadModal origin={uploadOrigin} draft={draft} isProfile profileUsername={profileUser.username} onPublish={onCreateChirp} onClose={({ queued } = {}) => { setUploadOrigin(null); if (queued) { setDraft(''); setComposerCycle(n => n + 1); setPostAnnouncement('Your media is on its way. Keep exploring while it saves.'); } }} />}
      {optionPost && <PostOptionsModal key={optionPost.id} post={optionPost} author={profileUser} currentUser={currentUser} appearance={appearancesByUid[String(optionPost.uid)]} saved={postPreferences.saved.includes(String(optionPost.id))} onClose={closeOptions} onEdit={onEditPost} onDelete={animateDelete} onHide={animateHide} onSave={onSavePost} />}
      {editorOpen && owner && <AppearanceEditor appearance={appearance} onChange={updateAppearance} onClose={() => setEditorOpen(false)} username={profileUser.username} />}
      {flight && <TextChirpFlightOverlay flight={flight} author={currentUser} appearance={appearancesByUid[String(flight.post.uid)]} viewerUid={currentUser?.uid} />}
    </main>
  );
}
